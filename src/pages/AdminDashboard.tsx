import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, LogOut, Users, BookMarked, Calendar as CalendarIcon, IndianRupee, Plus, Edit, Trash2, Check, X, Bell, RefreshCw, Search, Filter, MoreVertical, User } from "lucide-react";
import { format } from "date-fns";

// Fine calculation function
const calculateFine = (dueDate: string, returnDate?: string, dailyRate: number = 10) => {
  const due = new Date(dueDate);
  const today = returnDate ? new Date(returnDate) : new Date();
  const daysOverdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
  const totalFine = daysOverdue * dailyRate;
  return { totalFine, daysOverdue, isOverdue: daysOverdue > 0 };
};

const AdminDashboard = () => {
  const { user, profile, signOut, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([]);
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    totalBooks: 0, 
    totalCategories: 0, 
    totalUsers: 0, 
    borrowedCount: 0, 
    totalFees: 0 
  });
  const [requestActionLoadingId, setRequestActionLoadingId] = useState<string | null>(null);
  const [returnActionLoadingId, setReturnActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("books");
  const [newRequestCount, setNewRequestCount] = useState(0);
  const [borrowedCounts, setBorrowedCounts] = useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Form states
  const [bookForm, setBookForm] = useState({ 
    title: "", 
    author: "", 
    isbn: "", 
    category_id: "", 
    cover_image: "",
    total_copies: 10 
  });
  const [categoryForm, setCategoryForm] = useState({ name: "" });
  const [isBookDialogOpen, setIsBookDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);

  // Custom due date states
  const [customDueDate, setCustomDueDate] = useState<Date>();
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<any>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/signin");
    }
  }, [user, isAdmin, loading, navigate]);

  // Fetch all data when component mounts
  useEffect(() => {
    if (user && isAdmin) {
      fetchAllData();
    }
  }, [user, isAdmin]);

  const fetchAllData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchBooks(),
        fetchCategories(),
        fetchRequests(),
        fetchBorrowedBooks(),
        fetchReturnRequests(),
        fetchUsers(),
        fetchStats(),
        fetchBorrowedCounts()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter books based on search and category
  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || book.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
    const { data, error } = await supabase
      .from("books")
      .select(`*, categories (name)`)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching books:", error);
      toast.error("Failed to load books");
      return;
    }
    setBooks(data || []);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
      return;
    }
    setCategories(data || []);
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("book_requests")
        .select(`
          id,
          book_id,
          user_id,
          status,
          requested_at,
          books (
            title,
            author,
            cover_image,
            total_copies
          ),
          profiles!book_requests_user_id_fkey (
            full_name
          )
        `)
        .eq("status", "Pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
      setRequests([]);
    }
  };

  const fetchReturnRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("return_requests")
        .select(`
          id,
          user_id,
          borrowed_book_id,
          status,
          requested_at,
          processed_at,
          processed_by,
          borrowed_books (
            id,
            user_id,
            book_id,
            due_date,
            issue_date,
            books (title, author, total_copies)
          ),
          profiles!return_requests_user_id_fkey (
            full_name
          )
        `)
        .eq("status", "Pending")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      setReturnRequests(data || []);
    } catch (error) {
      console.error("Error fetching return requests:", error);
      toast.error("Failed to load return requests");
      setReturnRequests([]);
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!user || !isAdmin) return;

    const channel = supabase
      .channel("admin-book-requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "book_requests" },
        (payload: any) => {
          if (payload.new?.status === "Pending") {
            setNewRequestCount(prev => prev + 1);
            toast.info("New book request received");
            fetchRequests();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "return_requests" },
        (payload: any) => {
          if (payload.new?.status === "Pending") {
            setNewRequestCount(prev => prev + 1);
            toast.info("New return request received");
            fetchReturnRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (activeTab === "requests" && newRequestCount > 0) {
      setNewRequestCount(0);
    }
  }, [activeTab, newRequestCount]);

  const fetchBorrowedBooks = async () => {
    const { data, error } = await supabase
      .from("borrowed_books")
      .select(`*, books (title, author, cover_image), profiles (full_name)`)
      .is("return_date", null)
      .order("due_date", { ascending: true });
    
    if (error) {
      console.error("Error fetching borrowed books:", error);
      toast.error("Failed to load borrowed books");
      return;
    }
    setBorrowedBooks(data || []);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
      return;
    }
    setUsers(data || []);
  };

  const fetchStats = async () => {
    try {
      const [
        { count: booksCount },
        { count: categoriesCount },
        { count: usersCount },
        { count: borrowedCount },
        { data: borrowedBooksData }
      ] = await Promise.all([
        supabase.from("books").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("borrowed_books").select("*", { count: "exact", head: true }).is("return_date", null),
        supabase.from("borrowed_books").select("due_date").is("return_date", null)
      ]);

      // Calculate total fees by calculating fines for all borrowed books
      let totalFees = 0;
      borrowedBooksData?.forEach(book => {
        const fine = calculateFine(book.due_date);
        totalFees += fine.totalFine;
      });

      setStats({
        totalBooks: booksCount || 0,
        totalCategories: categoriesCount || 0,
        totalUsers: usersCount || 0,
        borrowedCount: borrowedCount || 0,
        totalFees,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load statistics");
    }
  };

  // Update fines in database
  const updateAllFines = async () => {
    try {
      // Get all borrowed books that haven't been returned
      const { data: borrowedBooks, error } = await supabase
        .from('borrowed_books')
        .select('*')
        .is('return_date', null);

      if (error) throw error;

      let updatedCount = 0;

      // Update fines for each borrowed book
      for (const book of borrowedBooks || []) {
        const fine = calculateFine(book.due_date);
        
        // Only update if there's a fine
        if (fine.totalFine > 0) {
          const { error: updateError } = await supabase
            .from('borrowed_books')
            .update({
              due_fee: fine.totalFine,
              total_fine: fine.totalFine,
              last_fine_update: new Date().toISOString()
            })
            .eq('id', book.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      }

      toast.success(`Fines updated for ${updatedCount} books`);
      fetchBorrowedBooks();
      fetchStats();
    } catch (error: any) {
      toast.error('Failed to update fines: ' + error.message);
    }
  };

  const handleAddBook = async () => {
    if (!bookForm.title || !bookForm.author || !bookForm.isbn || !bookForm.category_id || !bookForm.total_copies) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { error } = await supabase.from("books").insert([{
        ...bookForm,
        status: "Available",
      }]);
      if (error) throw error;
      
      toast.success("Book added successfully!");
      setBookForm({ title: "", author: "", isbn: "", category_id: "", cover_image: "", total_copies: 10 });
      setIsBookDialogOpen(false);
      fetchBooks();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to add book");
    }
  };

  const handleUpdateBook = async () => {
    if (!editingBook || !bookForm.title || !bookForm.author || !bookForm.isbn || !bookForm.category_id || !bookForm.total_copies) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("books")
        .update(bookForm)
        .eq("id", editingBook.id);
      
      if (error) throw error;
      
      toast.success("Book updated successfully!");
      setEditingBook(null);
      setBookForm({ title: "", author: "", isbn: "", category_id: "", cover_image: "", total_copies: 10 });
      setIsBookDialogOpen(false);
      fetchBooks();
    } catch (error: any) {
      toast.error(error.message || "Failed to update book");
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return;

    try {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Book deleted successfully!");
      fetchBooks();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete book");
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name) {
      toast.error("Please enter category name");
      return;
    }

    try {
      const { error } = await supabase.from("categories").insert([categoryForm]);
      if (error) throw error;
      
      toast.success("Category added successfully!");
      setCategoryForm({ name: "" });
      setIsCategoryDialogOpen(false);
      fetchCategories();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to add category");
    }
  };

  const openApproveDialog = (request: any) => {
    setCurrentRequest(request);
    setCustomDueDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)); // Default to 14 days from now
    setIsApproveDialogOpen(true);
  };

  const handleApproveRequest = async (requestId: string, bookId: string, userId: string) => {
    try {
      setRequestActionLoadingId(requestId);

      const { data: bookData } = await supabase
        .from("books")
        .select("total_copies")
        .eq("id", bookId)
        .single();

      const totalCopies = bookData?.total_copies || 10;
      const currentlyBorrowed = borrowedCounts[bookId] || 0;
      const availableCopies = totalCopies - currentlyBorrowed;

      if (availableCopies <= 0) {
        toast.error("No copies available to approve this request");
        return;
      }

      // Use custom due date if set, otherwise default to 14 days
      const dueDate = customDueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      // Update request status and create borrowed book record
      await Promise.all([
        supabase
          .from("book_requests")
          .update({ 
            status: "Approved", 
            reviewed_at: new Date().toISOString(), 
            reviewed_by: user?.id 
          })
          .eq("id", requestId),
        
        supabase
          .from("borrowed_books")
          .insert({
            user_id: userId,
            book_id: bookId,
            request_id: requestId,
            due_date: dueDate.toISOString(),
            daily_fine_rate: 10,
            total_fine: 0,
            due_fee: 0
          })
      ]);

      // Update book status
      const newBorrowedCount = currentlyBorrowed + 1;
      await supabase
        .from("books")
        .update({
          status: (totalCopies - newBorrowedCount) <= 0 ? "Unavailable" : "Available",
        })
        .eq("id", bookId);

      toast.success("Request approved!");
      fetchRequests();
      fetchBorrowedBooks();
      fetchBorrowedCounts();
      fetchBooks();
      fetchStats();
      
      // Reset the custom due date and close dialog
      setCustomDueDate(undefined);
      setIsApproveDialogOpen(false);
      setCurrentRequest(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to approve request");
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      setRequestActionLoadingId(requestId);
      await supabase
        .from("book_requests")
        .update({ 
          status: "Declined", 
          reviewed_at: new Date().toISOString(), 
          reviewed_by: user?.id 
        })
        .eq("id", requestId);

      toast.success("Request declined");
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to decline request");
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  const handleApproveReturn = async (returnRequest: any) => {
    try {
      setReturnActionLoadingId(returnRequest.id);
      const processedAt = new Date().toISOString();

      const borrowed = returnRequest.borrowed_books;
      if (!borrowed) {
        throw new Error("Borrowed book details unavailable");
      }

      // Calculate final fine
      const fine = calculateFine(borrowed.due_date, processedAt);
      
      // Update data with proper data types
      const updateData = {
        return_date: processedAt,
        due_fee: fine.totalFine,
        total_fine: fine.totalFine,
        last_fine_update: processedAt,
        fee_paid: fine.totalFine === 0
      };

      const { error: updateError } = await supabase
        .from("borrowed_books")
        .update(updateData)
        .eq("id", returnRequest.borrowed_book_id);

      if (updateError) {
        console.error('Error updating borrowed book:', updateError);
        throw updateError;
      }

      await supabase
        .from("return_requests")
        .update({
          status: "Approved",
          processed_at: processedAt,
          processed_by: user?.id || null,
        })
        .eq("id", returnRequest.id);

      toast.success(`Return approved${fine.totalFine > 0 ? ` with ₹${fine.totalFine} fine` : ''}`);
      fetchReturnRequests();
      fetchBorrowedBooks();
      fetchBorrowedCounts();
      fetchBooks();
      fetchStats();
    } catch (error: any) {
      console.error('Error in handleApproveReturn:', error);
      toast.error(error.message || "Failed to approve return request");
    } finally {
      setReturnActionLoadingId(null);
    }
  };

  const handleDeclineReturn = async (requestId: string) => {
    try {
      setReturnActionLoadingId(requestId);
      await supabase
        .from("return_requests")
        .update({
          status: "Declined",
          processed_at: new Date().toISOString(),
          processed_by: user?.id || null,
        })
        .eq("id", requestId);

      toast.success("Return request declined");
      fetchReturnRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to decline return request");
    } finally {
      setReturnActionLoadingId(null);
    }
  };

  const openEditDialog = (book: any) => {
    setEditingBook(book);
    setBookForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category_id: book.category_id,
      cover_image: book.cover_image || "",
      total_copies: book.total_copies || 10
    });
    setIsBookDialogOpen(true);
  };

  // Notification Bell Component
  const NotificationBell = () => {
    const totalPendingRequests = requests.length + returnRequests.length;
    
    return (
      <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {(newRequestCount > 0 || totalPendingRequests > 0) && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-destructive" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between p-4 border-b">
            <h4 className="font-semibold">Notifications</h4>
            {totalPendingRequests > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setActiveTab("requests");
                  setIsNotificationOpen(false);
                  setNewRequestCount(0);
                }}
              >
                View All
              </Button>
            )}
          </div>
          <ScrollArea className="h-80">
            {totalPendingRequests === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No new notifications
              </div>
            ) : (
              <div className="p-2">
                {requests.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium px-2 mb-2">Borrow Requests ({requests.length})</h5>
                    {requests.slice(0, 3).map((request) => (
                      <div 
                        key={request.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => {
                          setActiveTab("requests");
                          setIsNotificationOpen(false);
                          setNewRequestCount(0);
                        }}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                          <BookMarked className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">New borrow request</p>
                          <p className="text-xs text-muted-foreground">
                            {request.books?.title} • {request.profiles?.full_name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {returnRequests.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium px-2 mb-2">Return Requests ({returnRequests.length})</h5>
                    {returnRequests.slice(0, 3).map((request) => (
                      <div 
                        key={request.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => {
                          setActiveTab("requests");
                          setIsNotificationOpen(false);
                          setNewRequestCount(0);
                        }}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Return request</p>
                          <p className="text-xs text-muted-foreground">
                            {request.borrowed_books?.books?.title} • {request.profiles?.full_name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  };

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
                <h1 className="text-xl font-bold text-slate-800">Admin Dashboard</h1>
                <p className="text-sm text-slate-600 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Welcome back, {profile?.full_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchAllData} 
                disabled={isRefreshing}
                title="Refresh data"
                className="border-slate-300"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>

              {/* Update Fines Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={updateAllFines}
                title="Update all fines"
                className="border-slate-300"
              >
                <IndianRupee className="h-4 w-4 mr-1" />
                Update Fines
              </Button>

              <NotificationBell />
              <Button variant="outline" size="sm" onClick={signOut} className="border-slate-300">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card className="bg-white/80 border-slate-200/60">
            <CardHeader className="p-4 pb-3">
              <CardDescription className="flex items-center gap-2 text-xs">
                <BookOpen className="h-3 w-3" />
                Total Books
              </CardDescription>
              <CardTitle className="text-2xl">{stats.totalBooks}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white/80 border-slate-200/60">
            <CardHeader className="p-4 pb-3">
              <CardDescription className="flex items-center gap-2 text-xs">
                <Users className="h-3 w-3" />
                Users
              </CardDescription>
              <CardTitle className="text-2xl">{stats.totalUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white/80 border-slate-200/60">
            <CardHeader className="p-4 pb-3">
              <CardDescription className="flex items-center gap-2 text-xs">
                <BookMarked className="h-3 w-3" />
                Borrowed
              </CardDescription>
              <CardTitle className="text-2xl">{stats.borrowedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white/80 border-slate-200/60">
            <CardHeader className="p-4 pb-3">
              <CardDescription className="text-xs">Pending Requests</CardDescription>
              <CardTitle className="text-2xl">{requests.length + returnRequests.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white/80 border-slate-200/60">
            <CardHeader className="p-4 pb-3">
              <CardDescription className="flex items-center gap-2 text-xs">
                <IndianRupee className="h-3 w-3" />
                Due Fees
              </CardDescription>
              <CardTitle className="text-2xl">₹{stats.totalFees}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-slate-100/50 p-1 rounded-lg">
            <TabsTrigger value="books" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
              <BookOpen className="h-3 w-3 mr-2" />
              Books
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
              <Bell className="h-3 w-3 mr-2" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="borrowed" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
              <BookMarked className="h-3 w-3 mr-2" />
              Borrowed
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
              <Users className="h-3 w-3 mr-2" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Books Management */}
          <TabsContent value="books" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Book Collection</h2>
                <p className="text-slate-600 text-sm">Manage your library's book inventory</p>
              </div>
              <Dialog open={isBookDialogOpen} onOpenChange={setIsBookDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => { setEditingBook(null); setBookForm({ title: "", author: "", isbn: "", category_id: "", cover_image: "", total_copies: 10 }); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Book
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingBook ? "Edit Book" : "Add New Book"}</DialogTitle>
                    <DialogDescription>
                      {editingBook ? "Update the book details" : "Fill in the book details to add to your library"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input 
                          value={bookForm.title} 
                          onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                          placeholder="Enter book title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Author *</Label>
                        <Input 
                          value={bookForm.author} 
                          onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                          placeholder="Enter author name"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>ISBN *</Label>
                        <Input 
                          value={bookForm.isbn} 
                          onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                          placeholder="Enter ISBN number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select value={bookForm.category_id} onValueChange={(value) => setBookForm({ ...bookForm, category_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Total Copies *</Label>
                        <Input 
                          type="number" 
                          min="1"
                          value={bookForm.total_copies} 
                          onChange={(e) => setBookForm({ ...bookForm, total_copies: parseInt(e.target.value) || 1 })} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cover Image URL</Label>
                        <Input 
                          value={bookForm.cover_image} 
                          onChange={(e) => setBookForm({ ...bookForm, cover_image: e.target.value })}
                          placeholder="https://example.com/cover.jpg"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <div className="flex gap-2 w-full">
                      <Button variant="outline" onClick={() => setIsBookDialogOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={editingBook ? handleUpdateBook : handleAddBook} className="flex-1">
                        {editingBook ? "Update" : "Add"} Book
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search and Filter */}
            <div className="grid gap-4 md:grid-cols-3">
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
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-white/80 border-slate-300">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-slate-300">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Category</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Label>Category Name</Label>
                      <Input 
                        value={categoryForm.name} 
                        onChange={(e) => setCategoryForm({ name: e.target.value })}
                        placeholder="Enter category name"
                      />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddCategory}>Add Category</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Books Count */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-800">
                Books {filteredBooks.length > 0 && `(${filteredBooks.length})`}
              </h3>
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                  {categories.find(cat => cat.id === selectedCategory)?.name || "Selected Category"}
                </Badge>
              )}
            </div>

            {/* Books Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredBooks.map((book) => {
                const availableCopies = (book.total_copies || 10) - (borrowedCounts[book.id] || 0);
                
                return (
                  <Card key={book.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200/60 overflow-hidden">
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
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-7"
                          onClick={() => openEditDialog(book)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-7"
                          onClick={() => handleDeleteBook(book.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
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
                      : "Get started by adding your first book to the library"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Requests Management */}
          <TabsContent value="requests">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Pending Requests</h2>
                <p className="text-slate-600 text-sm">Manage book borrow and return requests</p>
              </div>

              {/* Approve Request Dialog */}
              <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Approve Book Request</DialogTitle>
                    <DialogDescription>
                      Set the due date for this book borrowing request.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {currentRequest && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <img 
                          src={currentRequest.books?.cover_image || "/placeholder.svg"} 
                          alt={currentRequest.books?.title} 
                          className="w-12 h-16 object-cover rounded border"
                        />
                        <div>
                          <h4 className="font-semibold text-sm">{currentRequest.books?.title}</h4>
                          <p className="text-slate-600 text-xs">{currentRequest.books?.author}</p>
                          <p className="text-slate-500 text-xs">Requested by: {currentRequest.profiles?.full_name}</p>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="due-date">Due Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customDueDate ? format(customDueDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={customDueDate}
                            onSelect={setCustomDueDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due-time">Due Time (Optional)</Label>
                      <Input
                        type="time"
                        value={customDueDate ? format(customDueDate, "HH:mm") : ""}
                        onChange={(e) => {
                          if (customDueDate && e.target.value) {
                            const [hours, minutes] = e.target.value.split(':');
                            const newDate = new Date(customDueDate);
                            newDate.setHours(parseInt(hours), parseInt(minutes));
                            setCustomDueDate(newDate);
                          }
                        }}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsApproveDialogOpen(false);
                        setCustomDueDate(undefined);
                        setCurrentRequest(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (currentRequest) {
                          handleApproveRequest(
                            currentRequest.id,
                            currentRequest.book_id,
                            currentRequest.user_id
                          );
                        }
                      }}
                      disabled={!customDueDate}
                    >
                      Approve Request
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="grid gap-4">
                {/* Borrow Requests */}
                <Card className="bg-white/80 border-slate-200/60">
                  <CardHeader className="border-b border-slate-200/60 p-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookMarked className="h-5 w-5" />
                      Borrow Requests ({requests.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {requests.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <BookMarked className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No pending borrow requests</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200/60">
                        {requests.map((request) => {
                          const availableCopies = (request.books?.total_copies || 10) - (borrowedCounts[request.book_id] || 0);
                          return (
                            <div key={request.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <img 
                                    src={request.books?.cover_image || "/placeholder.svg"} 
                                    alt={request.books?.title} 
                                    className="w-12 h-16 object-cover rounded border"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-slate-800 text-sm line-clamp-1">{request.books?.title}</h4>
                                    <p className="text-slate-600 text-xs line-clamp-1">{request.books?.author}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                      <span>By: {request.profiles?.full_name || "Unknown"}</span>
                                      <span>•</span>
                                      <span>{new Date(request.requested_at).toLocaleDateString()}</span>
                                      <span>•</span>
                                      <span>Available: {availableCopies}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm"
                                    onClick={() => openApproveDialog(request)} 
                                    disabled={requestActionLoadingId === request.id || availableCopies <= 0}
                                    className="text-xs h-8"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    {requestActionLoadingId === request.id ? "..." : "Approve"}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleDeclineRequest(request.id)} 
                                    disabled={requestActionLoadingId === request.id}
                                    className="text-xs h-8 border-slate-300"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Decline
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Return Requests */}
                <Card className="bg-white/80 border-slate-200/60">
                  <CardHeader className="border-b border-slate-200/60 p-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Check className="h-5 w-5" />
                      Return Requests ({returnRequests.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {returnRequests.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No pending return requests</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200/60">
                        {returnRequests.map((request) => {
                          const borrowed = request.borrowed_books;
                          const dueDate = borrowed ? new Date(borrowed.due_date) : new Date();
                          const today = new Date();
                          const isOverdue = dueDate < today;
                          
                          return (
                            <div key={request.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="w-12 h-16 bg-slate-100 rounded border flex items-center justify-center">
                                    <BookOpen className="h-6 w-6 text-slate-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-slate-800 text-sm line-clamp-1">{borrowed?.books?.title}</h4>
                                    <p className="text-slate-600 text-xs line-clamp-1">{borrowed?.books?.author}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs">
                                      <span className="text-slate-500">By: {request.profiles?.full_name || "Unknown"}</span>
                                      <span className="text-slate-500">•</span>
                                      <span className={isOverdue ? "text-red-600 font-semibold" : "text-slate-500"}>
                                        Due: {dueDate.toLocaleDateString()}
                                      </span>
                                      {isOverdue && (
                                        <>
                                          <span className="text-slate-500">•</span>
                                          <Badge variant="destructive" className="text-xs">
                                            Overdue
                                          </Badge>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveReturn(request)}
                                    disabled={returnActionLoadingId === request.id}
                                    className="text-xs h-8"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    {returnActionLoadingId === request.id ? "..." : "Approve"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeclineReturn(request.id)}
                                    disabled={returnActionLoadingId === request.id}
                                    className="text-xs h-8 border-slate-300"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Decline
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Borrowed Books */}
          <TabsContent value="borrowed">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Currently Borrowed Books</h2>
                <p className="text-slate-600 text-sm">Track all books currently borrowed from the library</p>
              </div>

              <div className="grid gap-3">
                {borrowedBooks.map((borrowed) => {
                  // Calculate current fine (real-time)
                  const fine = calculateFine(borrowed.due_date);
                  const dueDate = new Date(borrowed.due_date);
                  const today = new Date();
                  const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = fine.isOverdue;

                  return (
                    <Card key={borrowed.id} className={`bg-white/80 border-slate-200/60 ${isOverdue ? "border-red-200/50 bg-red-50/30" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <img 
                              src={borrowed.books?.cover_image || "/placeholder.svg"} 
                              alt={borrowed.books?.title} 
                              className="w-12 h-16 object-cover rounded border"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-800 text-sm line-clamp-1">{borrowed.books?.title}</h4>
                              <p className="text-slate-600 text-xs line-clamp-1">{borrowed.books?.author}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                <span>By: {borrowed.profiles?.full_name}</span>
                                <span>•</span>
                                <span>Due: {dueDate.toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <Badge variant={isOverdue ? "destructive" : daysRemaining <= 3 ? "secondary" : "default"}>
                              {isOverdue 
                                ? `${fine.daysOverdue}d overdue` 
                                : `${daysRemaining}d left`}
                            </Badge>
                            {fine.totalFine > 0 && (
                              <div className="flex items-center gap-1 text-red-600 font-semibold text-xs">
                                <IndianRupee className="h-3 w-3" />
                                <span>₹{fine.totalFine} ({fine.daysOverdue} days)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {borrowedBooks.length === 0 && (
                  <Card className="bg-white/80 border-slate-200/60">
                    <CardContent className="py-12 text-center">
                      <BookMarked className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                      <p className="text-slate-700">No borrowed books.</p>
                      <p className="text-slate-600 text-sm mt-2">All books are currently available in the library</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Library Users</h2>
                <p className="text-slate-600 text-sm">Manage user accounts and permissions</p>
              </div>

              <div className="grid gap-3">
                {users.map((user) => (
                  <Card key={user.id} className="bg-white/80 border-slate-200/60">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-slate-800 text-sm line-clamp-1">{user.full_name}</h4>
                            <p className="text-slate-600 text-xs line-clamp-1">{user.email}</p>
                            <p className="text-slate-500 text-xs mt-1">
                              Joined: {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;