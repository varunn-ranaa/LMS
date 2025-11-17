import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Search, LogOut, Clock, Calendar, IndianRupee, Filter, User } from "lucide-react";

const StudentDashboard = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [requests, setRequests] = useState<any[]>([]);
  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([]);
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [returnRequestLoadingId, setReturnRequestLoadingId] = useState<string | null>(null);
  const [borrowedCounts, setBorrowedCounts] = useState<Record<string, number>>({});
  const [currentBorrowedCount, setCurrentBorrowedCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/signin");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBooks();
      fetchCategories();
      fetchRequests();
      fetchBorrowedBooks();
      fetchReturnRequests();
      fetchBorrowedCounts();
    }
  }, [user]);

  // Add real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('student-real-time')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'borrowed_books' },
        () => {
          fetchBorrowedCounts();
          fetchBorrowedBooks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchBorrowedCounts = async () => {
    const { data } = await supabase
      .from("borrowed_books")
      .select("book_id")
      .is("return_date", null);
    
    const counts: Record<string, number> = {};
    data?.forEach((item) => {
      counts[item.book_id] = (counts[item.book_id] || 0) + 1;
    });
    setBorrowedCounts(counts);
  };

  const fetchBooks = async () => {
    const { data } = await supabase
      .from("books")
      .select(`
        *,
        categories (name)
      `)
      .order("title");
    setBooks(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    setCategories(data || []);
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("book_requests")
      .select(`
        *,
        books (title, author, cover_image)
      `)
      .eq("user_id", user?.id)
      .order("requested_at", { ascending: false });
    setRequests(data || []);
  };

  const fetchBorrowedBooks = async () => {
    const { data } = await supabase
      .from("borrowed_books")
      .select(`
        *,
        books (title, author, cover_image)
      `)
      .eq("user_id", user?.id)
      .is("return_date", null)
      .order("issue_date", { ascending: false });
    
    setBorrowedBooks(data || []);
    setCurrentBorrowedCount(data?.length || 0);
  };

  const handleRequestBook = async (bookId: string) => {
    try {
      // CHECK 1: Get user's currently borrowed books count
      const { data: userBorrowedBooks, error: countError } = await supabase
        .from("borrowed_books")
        .select("id")
        .eq("user_id", user?.id)
        .is("return_date", null);

      if (countError) throw countError;

      const currentBorrowedCount = userBorrowedBooks?.length || 0;
      
      if (currentBorrowedCount >= 3) {
        toast.error("You can only borrow maximum 3 books at a time");
        return;
      }

      // CHECK 2: Get book availability
      const { data: bookData } = await supabase
        .from("books")
        .select("total_copies")
        .eq("id", bookId)
        .single();

      const totalCopies = bookData?.total_copies || 10;
      const currentlyBorrowed = borrowedCounts[bookId] || 0;
      const availableCopies = totalCopies - currentlyBorrowed;

      if (availableCopies <= 0) {
        toast.error("No copies available for this book");
        return;
      }

      // CHECK 3: Create the request
      const { error } = await supabase
        .from("book_requests")
        .insert({ 
          user_id: user?.id, 
          book_id: bookId, 
          status: "Pending" 
        });

      if (error) throw error;

      toast.success("Book request submitted!");
      fetchRequests();
      
    } catch (error: any) {
      toast.error(error.message || "Failed to request book");
    }
  };

  const calculateDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const calculateDueFee = (dueDate: string) => {
    const daysOverdue = -calculateDaysRemaining(dueDate);
    return daysOverdue > 0 ? daysOverdue * 10 : 0;
  };

  const fetchReturnRequests = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("return_requests")
        .select(`
          id,
          borrowed_book_id,
          status,
          requested_at,
          borrowed_books (
            id,
            book_id,
            books (title, author, cover_image)
          )
        `)
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false });

      if (error) {
        toast.error("Failed to load return requests");
        return;
      }

      setReturnRequests(data || []);
    } catch (error) {
      console.error("Error fetching return requests:", error);
    }
  };

  const handleReturnRequest = async (borrowedId: string) => {
    if (!user?.id) return;

    try {
      const existingRequest = returnRequests.find(
        (req) => req.borrowed_book_id === borrowedId && req.status === "Pending"
      );

      if (existingRequest) {
        toast.info("Return request already pending for this book");
        return;
      }

      setReturnRequestLoadingId(borrowedId);

      const { error } = await supabase
        .from("return_requests")
        .insert({
          borrowed_book_id: borrowedId,
          user_id: user.id,
          status: "Pending",
        });

      if (error) throw error;

      toast.success("Return request sent to admin!");
      fetchReturnRequests();
      fetchBorrowedBooks();
    } catch (error: any) {
      toast.error(error.message || "Failed to send return request");
    } finally {
      setReturnRequestLoadingId(null);
    }
  };

  const filteredBooks = books.filter((book) => {
    const matchesSearch = 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === "all" || 
      book.categories?.name === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Student Dashboard</h1>
                <p className="text-sm text-slate-600 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Welcome, {profile?.full_name}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={signOut} className="border-slate-300">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100/50 p-1 rounded-lg">
            <TabsTrigger value="browse" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Browse Books
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              My Requests
            </TabsTrigger>
            <TabsTrigger value="borrowed" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Borrowed Books
            </TabsTrigger>
          </TabsList>

          {/* Browse Books */}
          <TabsContent value="browse" className="space-y-6">
            {/* Search and Filter Section */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Search Bar */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search books by title or author..."
                    className="pl-10 bg-white/80 border-slate-300"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-white/80 border-slate-300">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Book Limit Info */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Your Book Limit</p>
                    <p className="text-xs text-slate-600">
                      {currentBorrowedCount} / 3 books currently borrowed
                    </p>
                  </div>
                  <Badge 
                    variant={currentBorrowedCount >= 3 ? "destructive" : "default"} 
                    className={currentBorrowedCount >= 3 ? "bg-red-500" : "bg-green-500"}
                  >
                    {currentBorrowedCount >= 3 ? "Limit Reached" : "Available"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Books Count */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-800">
                Available Books {filteredBooks.length > 0 && `(${filteredBooks.length})`}
              </h3>
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                  {selectedCategory}
                </Badge>
              )}
            </div>

            {/* Books Grid - Compact and Clean */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredBooks.map((book) => {
                const availableCopies = (book.total_copies || 10) - (borrowedCounts[book.id] || 0);
                const isUnavailable = availableCopies <= 0;
                const hasPendingRequest = requests.some(r => r.book_id === book.id && r.status === "Pending");
                
                return (
                  <Card key={book.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200/60 overflow-hidden">
                    {/* Book Cover */}
                    <div className="aspect-[3/4] overflow-hidden bg-slate-100">
                      <img
                        src={book.cover_image || "/placeholder.svg"}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    
                    <CardContent className="p-3">
                      <CardTitle className="text-sm font-semibold line-clamp-2 leading-tight mb-1 text-slate-800">
                        {book.title}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-1 text-slate-600 mb-2">
                        {book.author}
                      </CardDescription>
                      
                      {/* Availability */}
                      <div className="flex justify-between items-center mb-3">
                        <Badge 
                          variant={availableCopies > 0 ? "default" : "destructive"} 
                          className="text-xs px-1.5 py-0"
                        >
                          {availableCopies > 0 ? "Available" : "Unavailable"}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {availableCopies}/{book.total_copies || 10}
                        </span>
                      </div>
                      
                      {/* Request Button */}
                      <Button
                        className="w-full text-xs h-8"
                        onClick={() => handleRequestBook(book.id)}
                        disabled={isUnavailable || hasPendingRequest || currentBorrowedCount >= 3}
                        size="sm"
                      >
                        {currentBorrowedCount >= 3
                          ? "Limit Reached"
                          : isUnavailable
                          ? "Unavailable"
                          : hasPendingRequest
                          ? "Requested"
                          : "Request"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredBooks.length === 0 && (
              <Card className="bg-white/80 border-slate-200/60">
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No books found</h3>
                  <p className="text-slate-600 text-sm">
                    {searchQuery || selectedCategory !== "all" 
                      ? "Try adjusting your search or filter criteria" 
                      : "No books available in the library"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* My Requests */}
          <TabsContent value="requests">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">My Book Requests</h3>
              {requests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow border-slate-200/60">
                  <CardContent className="flex items-center gap-4 p-4">
                    <img
                      src={request.books.cover_image || "/placeholder.svg"}
                      alt={request.books.title}
                      className="w-12 h-16 object-cover rounded border"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 text-sm line-clamp-1">{request.books.title}</h3>
                      <p className="text-slate-600 text-xs line-clamp-1">{request.books.author}</p>
                      <p className="text-slate-500 text-xs mt-1">
                        Requested: {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={
                      request.status === "Approved" ? "default" :
                      request.status === "Declined" ? "destructive" :
                      "secondary"
                    } className="shrink-0">
                      {request.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              {requests.length === 0 && (
                <Card className="bg-white/80 border-slate-200/60">
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-700">No requests yet.</p>
                    <p className="text-slate-600 text-sm mt-2">Browse books and request to borrow!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Borrowed Books */}
          <TabsContent value="borrowed">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Currently Borrowed Books</h3>
              {borrowedBooks.map((borrowed) => {
                const daysRemaining = calculateDaysRemaining(borrowed.due_date);
                const dueFee = calculateDueFee(borrowed.due_date);
                const activeReturnRequest = returnRequests.find(
                  (request) => request.borrowed_book_id === borrowed.id && request.status === "Pending"
                );
                
                return (
                  <Card key={borrowed.id} className="hover:shadow-md transition-shadow border-slate-200/60">
                    <CardContent className="flex items-center gap-4 p-4">
                      <img
                        src={borrowed.books.cover_image || "/placeholder.svg"}
                        alt={borrowed.books.title}
                        className="w-12 h-16 object-cover rounded border"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 text-sm line-clamp-1">{borrowed.books.title}</h3>
                        <p className="text-slate-600 text-xs line-clamp-1">{borrowed.books.author}</p>
                        
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Calendar className="h-3 w-3" />
                            <span>Issued: {new Date(borrowed.issue_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <Clock className="h-3 w-3" />
                            <span>Due: {new Date(borrowed.due_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right flex flex-col items-end gap-2">
                        <Badge variant={daysRemaining < 0 ? "destructive" : daysRemaining < 3 ? "secondary" : "default"}>
                          {daysRemaining < 0 
                            ? `${Math.abs(daysRemaining)}d overdue` 
                            : `${daysRemaining}d left`}
                        </Badge>
                        {dueFee > 0 && (
                          <div className="flex items-center gap-1 text-red-600 font-semibold text-xs">
                            <IndianRupee className="h-3 w-3" />
                            <span>{dueFee}</span>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => handleReturnRequest(borrowed.id)}
                          disabled={!!activeReturnRequest || returnRequestLoadingId === borrowed.id}
                        >
                          {returnRequestLoadingId === borrowed.id
                            ? "Submitting..."
                            : activeReturnRequest
                              ? "Return Requested"
                              : "Return"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {borrowedBooks.length === 0 && (
                <Card className="bg-white/80 border-slate-200/60">
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-700">No borrowed books.</p>
                    <p className="text-slate-600 text-sm mt-2">Request books to get started!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;