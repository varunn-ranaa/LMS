import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Search, LogOut, Clock, Calendar, IndianRupee } from "lucide-react";

const StudentDashboard = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [requests, setRequests] = useState<any[]>([]);
  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([]);
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [returnRequestLoadingId, setReturnRequestLoadingId] = useState<string | null>(null);
  const [borrowedCounts, setBorrowedCounts] = useState<Record<string, number>>({});

  const DEFAULT_TOTAL_COPIES = 10;

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
      .eq("status", "Available");
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
  };

  const handleRequestBook = async (bookId: string) => {
    try {
      // Calculate available copies dynamically
      const currentlyBorrowed = borrowedCounts[bookId] || 0;
      const availableCopies = DEFAULT_TOTAL_COPIES - currentlyBorrowed;

      if (availableCopies <= 0) {
        toast.error("No copies available for this book");
        return;
      }

      const { error } = await supabase
        .from("book_requests")
        .insert({ user_id: user?.id, book_id: bookId, status: "Pending" });

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

    const { data, error } = await supabase
      .from("return_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("Failed to load return requests", error);
      return;
    }

    setReturnRequests(data || []);
  };

  const handleReturnRequest = async (borrowedBookId: string) => {
    if (!user?.id) return;

    try {
      if (returnRequests.some((req) => req.borrowed_book_id === borrowedBookId && req.status === "Pending")) {
        toast.info("Return request already pending for this book");
        return;
      }

      setReturnRequestLoadingId(borrowedBookId);
      const { error } = await supabase
        .from("return_requests")
        .insert({
          borrowed_book_id: borrowedBookId,
          user_id: user.id,
          status: "Pending",
        });

      if (error) throw error;

      toast.success("Return request sent to admin");
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
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.isbn.includes(searchQuery);
    
    const matchesCategory = 
      selectedCategory === "All" || 
      book.categories?.name === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-heading font-bold">Student Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome, {profile?.full_name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="browse">Browse Books</TabsTrigger>
            <TabsTrigger value="requests">My Requests</TabsTrigger>
            <TabsTrigger value="borrowed">Borrowed Books</TabsTrigger>
          </TabsList>

          {/* Browse Books */}
          <TabsContent value="browse" className="space-y-6">
            {/* Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by title, author, or ISBN..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === "All" ? "default" : "outline"}
                onClick={() => setSelectedCategory("All")}
                size="sm"
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.name ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat.name)}
                  size="sm"
                >
                  {cat.name}
                </Button>
              ))}
            </div>

            {/* Books Grid */}
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredBooks.map((book) => (
                <Card key={book.id} className="overflow-hidden hover:shadow-lg transition">
                  <div className="aspect-[3/4] overflow-hidden bg-muted">
                    <img
                      src={book.cover_image || "/placeholder.svg"}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-base line-clamp-2">{book.title}</CardTitle>
                    <CardDescription className="line-clamp-1">{book.author}</CardDescription>
                    <p className="text-xs text-muted-foreground">
                      Copies available: {Math.max(0, DEFAULT_TOTAL_COPIES - (borrowedCounts[book.id] || 0))}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() => handleRequestBook(book.id)}
                      disabled={
                        (DEFAULT_TOTAL_COPIES - (borrowedCounts[book.id] || 0)) <= 0 ||
                        requests.some(r => r.book_id === book.id && r.status === "Pending")
                      }
                    >
                      {(DEFAULT_TOTAL_COPIES - (borrowedCounts[book.id] || 0)) <= 0
                        ? "Unavailable"
                        : requests.some(r => r.book_id === book.id && r.status === "Pending")
                        ? "Requested"
                        : "Request"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* My Requests */}
          <TabsContent value="requests">
            <div className="grid gap-4">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="flex items-center gap-4 pt-6">
                    <img
                      src={request.books.cover_image || "/placeholder.svg"}
                      alt={request.books.title}
                      className="w-20 h-28 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-heading font-semibold">{request.books.title}</h3>
                      <p className="text-sm text-muted-foreground">{request.books.author}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Requested: {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={
                      request.status === "Approved" ? "default" :
                      request.status === "Declined" ? "destructive" :
                      "secondary"
                    }>
                      {request.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              {requests.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No requests yet. Browse books and request to borrow!
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Borrowed Books */}
          <TabsContent value="borrowed">
            <div className="grid gap-4">
              {borrowedBooks.map((borrowed) => {
                const daysRemaining = calculateDaysRemaining(borrowed.due_date);
                const dueFee = calculateDueFee(borrowed.due_date);
                const activeReturnRequest = returnRequests.find(
                  (request) =>
                    request.borrowed_book_id === borrowed.id && request.status === "Pending"
                );
                const declinedReturnRequest = returnRequests.find(
                  (request) =>
                    request.borrowed_book_id === borrowed.id && request.status === "Declined"
                );
                
                return (
                  <Card key={borrowed.id}>
                    <CardContent className="flex items-center gap-4 pt-6">
                      <img
                        src={borrowed.books.cover_image || "/placeholder.svg"}
                        alt={borrowed.books.title}
                        className="w-20 h-28 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-heading font-semibold">{borrowed.books.title}</h3>
                        <p className="text-sm text-muted-foreground">{borrowed.books.author}</p>
                        
                        <div className="mt-3 space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Issued: {new Date(borrowed.issue_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Due: {new Date(borrowed.due_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right flex flex-col items-end">
                        <Badge variant={daysRemaining < 0 ? "destructive" : daysRemaining < 3 ? "secondary" : "default"}>
                          {daysRemaining < 0 
                            ? `${Math.abs(daysRemaining)} days overdue` 
                            : `${daysRemaining} days left`}
                        </Badge>
                        {dueFee > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-destructive font-semibold">
                            <IndianRupee className="h-4 w-4" />
                            <span>{dueFee}</span>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => handleReturnRequest(borrowed.id)}
                          disabled={!!activeReturnRequest || returnRequestLoadingId === borrowed.id}
                        >
                          {returnRequestLoadingId === borrowed.id
                            ? "Submitting..."
                            : activeReturnRequest
                              ? "Return Requested"
                              : "Request Return"}
                        </Button>
                        {declinedReturnRequest && !activeReturnRequest && (
                          <p className="mt-2 text-xs text-destructive text-right">
                            Return request declined. Please contact the admin.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {borrowedBooks.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No borrowed books. Request books to get started!
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
