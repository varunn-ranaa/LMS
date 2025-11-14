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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, LogOut, Users, BookMarked, Calendar, IndianRupee, Plus, Edit, Trash2, Check, X, Bell } from "lucide-react";

const AdminDashboard = () => {
  const { user, profile, signOut, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([]);
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalBooks: 0, totalCategories: 0, totalUsers: 0, borrowedCount: 0, totalFees: 0 });
  const [requestActionLoadingId, setRequestActionLoadingId] = useState<string | null>(null);
  const [returnActionLoadingId, setReturnActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("books");
  const [newRequestCount, setNewRequestCount] = useState(0);
  const [borrowedCounts, setBorrowedCounts] = useState<Record<string, number>>({});

  const DEFAULT_TOTAL_COPIES = 10;

  // Form states
  const [bookForm, setBookForm] = useState({ title: "", author: "", isbn: "", category_id: "", cover_image: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "" });
  const [isBookDialogOpen, setIsBookDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/signin");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      // Ensure admin has correct DB role so RLS permits viewing all requests
      if (user.email === "admin@library.com") {
        await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            role: "admin",
            email: user.email || "admin@library.com",
            full_name: profile?.full_name || "Admin",
          }, { onConflict: "id" });
      }
      if (isAdmin) {
        fetchAllData();
      }
    };
    init();
  }, [user, isAdmin]);

  const fetchAllData = async () => {
    fetchBooks();
    fetchCategories();
    fetchRequests();
    fetchBorrowedBooks();
    fetchReturnRequests();
    fetchUsers();
    fetchStats();
    fetchBorrowedCounts();
  };

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
      .select(`*, categories (name)`)
      .order("created_at", { ascending: false });
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
    const { data, error } = await supabase
      .from("book_requests")
      .select(`
        id,
        book_id,
        user_id,
        status,
        requested_at,
        books (title, author, cover_image),
        requester:profiles!book_requests_user_id_fkey (full_name),
        reviewer:profiles!book_requests_reviewed_by_fkey (full_name)
      `)
      .eq("status", "Pending")
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch requests:", error);
      toast.error("Unable to load requests. Check admin permissions or Supabase policies.");
      setRequests([]);
      return;
    }

    setRequests(data || []);
  };

  const fetchReturnRequests = async () => {
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
          book_id,
          due_date,
          issue_date,
          books (title, author, total_copies),
          profiles (full_name)
        )
      `)
      .eq("status", "Pending")
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch return requests:", error);
      toast.error("Unable to load return requests.");
      setReturnRequests([]);
      return;
    }

    setReturnRequests(data || []);
  };

  useEffect(() => {
    if (!user || !isAdmin) return;

    const channel = supabase
      .channel("admin-book-requests")
      // New pending requests
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "book_requests" },
        (payload: any) => {
          if (payload.new?.status === "Pending") {
            setNewRequestCount((count) => count + 1);
            toast.info("New book request received");
            fetchRequests();
          }
        }
      )
      // Status changes (approve/decline) should refresh the list
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "book_requests" },
        () => {
          fetchRequests();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "return_requests" },
        (payload: any) => {
          if (payload.new?.status === "Pending") {
            setNewRequestCount((count) => count + 1);
            toast.info("New return request received");
            fetchReturnRequests();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "return_requests" },
        () => {
          fetchReturnRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (activeTab === "requests" && newRequestCount > 0) {
      setNewRequestCount(0);
    }
  }, [activeTab, newRequestCount]);


  const fetchBorrowedBooks = async () => {
    const { data } = await supabase
      .from("borrowed_books")
      .select(`*, books (title, author), profiles (full_name)`)
      .is("return_date", null)
      .order("due_date", { ascending: true });
    setBorrowedBooks(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
  };

  const fetchStats = async () => {
    const { count: booksCount } = await supabase.from("books").select("*", { count: "exact", head: true });
    const { count: categoriesCount } = await supabase.from("categories").select("*", { count: "exact", head: true });
    const { count: usersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: borrowedCount } = await supabase.from("borrowed_books").select("*", { count: "exact", head: true }).is("return_date", null);
    
    const { data: feeData } = await supabase
      .from("borrowed_books")
      .select("due_fee")
      .is("return_date", null);
    
    const totalFees = feeData?.reduce((sum, item) => sum + (item.due_fee || 0), 0) || 0;

    setStats({
      totalBooks: booksCount || 0,
      totalCategories: categoriesCount || 0,
      totalUsers: usersCount || 0,
      borrowedCount: borrowedCount || 0,
      totalFees,
    });
  };

  const handleAddBook = async () => {
    if (!bookForm.title || !bookForm.author || !bookForm.isbn || !bookForm.category_id) {
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
      setBookForm({ title: "", author: "", isbn: "", category_id: "", cover_image: "" });
      setIsBookDialogOpen(false);
      fetchBooks();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to add book");
    }
  };

  const handleUpdateBook = async () => {
    if (!editingBook || !bookForm.title || !bookForm.author || !bookForm.isbn || !bookForm.category_id) {
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
      setBookForm({ title: "", author: "", isbn: "", category_id: "", cover_image: "" });
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

  const handleApproveRequest = async (requestId: string, bookId: string, userId: string) => {
    try {
      setRequestActionLoadingId(requestId);

      // Calculate available copies dynamically
      const currentlyBorrowed = borrowedCounts[bookId] || 0;
      const availableCopies = DEFAULT_TOTAL_COPIES - currentlyBorrowed;

      if (availableCopies <= 0) {
        toast.error("No copies available to approve this request");
        return;
      }

      // Update request status
      await supabase
        .from("book_requests")
        .update({ status: "Approved", reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq("id", requestId);

      // Create borrowed book record (14 days borrowing period)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
      
      await supabase
        .from("borrowed_books")
        .insert({
          user_id: userId,
          book_id: bookId,
          request_id: requestId,
          due_date: dueDate.toISOString(),
        });

      // Update book status based on new borrowed count
      const newBorrowedCount = currentlyBorrowed + 1;
      const newAvailableCopies = DEFAULT_TOTAL_COPIES - newBorrowedCount;
      
      await supabase
        .from("books")
        .update({
          status: newAvailableCopies <= 0 ? "Unavailable" : "Available",
        })
        .eq("id", bookId);

      toast.success("Request approved!");
      fetchRequests();
      fetchBorrowedBooks();
      fetchBorrowedCounts();
      fetchBooks();
      fetchStats();
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
        .update({ status: "Declined", reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
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

      const dueDate = new Date(borrowed.due_date);
      const today = new Date();
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const dueFee = daysOverdue > 0 ? daysOverdue * 10 : 0;

      await supabase
        .from("borrowed_books")
        .update({
          return_date: processedAt,
          due_fee: dueFee,
        })
        .eq("id", returnRequest.borrowed_book_id);

      // Calculate available copies after return
      const currentlyBorrowed = (borrowedCounts[borrowed.book_id] || 0) - 1;
      const availableCopies = DEFAULT_TOTAL_COPIES - currentlyBorrowed;

      await supabase
        .from("books")
        .update({
          status: availableCopies > 0 ? "Available" : "Unavailable",
        })
        .eq("id", borrowed.book_id);

      await supabase
        .from("return_requests")
        .update({
          status: "Approved",
          processed_at: processedAt,
          processed_by: user?.id || null,
        })
        .eq("id", returnRequest.id);

      toast.success("Return request approved");
      fetchReturnRequests();
      fetchBorrowedBooks();
      fetchBorrowedCounts();
      fetchBooks();
      fetchStats();
    } catch (error: any) {
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
    });
    setIsBookDialogOpen(true);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const pendingReturnRequests = returnRequests;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-heading font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome, {profile?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => {
                setActiveTab("requests");
                setNewRequestCount(0);
              }}
            >
              <Bell className="h-5 w-5" />
              {newRequestCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-white">
                  {newRequestCount}
                </span>
              )}
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Books</CardDescription>
              <CardTitle className="text-3xl">{stats.totalBooks}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Categories</CardDescription>
              <CardTitle className="text-3xl">{stats.totalCategories}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Users</CardDescription>
              <CardTitle className="text-3xl">{stats.totalUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Borrowed</CardDescription>
              <CardTitle className="text-3xl">{stats.borrowedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Due Fees</CardDescription>
              <CardTitle className="text-3xl flex items-center">
                <IndianRupee className="h-6 w-6" />
                {stats.totalFees}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="books">Books</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="borrowed">Borrowed</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          {/* Books Management */}
          <TabsContent value="books" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-heading font-bold">Manage Books</h2>
              <Dialog open={isBookDialogOpen} onOpenChange={setIsBookDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingBook(null); setBookForm({ title: "", author: "", isbn: "", category_id: "", cover_image: "" }); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Book
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingBook ? "Edit Book" : "Add New Book"}</DialogTitle>
                    <DialogDescription>Fill in the book details</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Title *</Label>
                      <Input value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} />
                    </div>
                    <div>
                      <Label>Author *</Label>
                      <Input value={bookForm.author} onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} />
                    </div>
                    <div>
                      <Label>ISBN *</Label>
                      <Input value={bookForm.isbn} onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })} />
                    </div>
                    <div>
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
                    <div>
                      <Label>Cover Image URL</Label>
                      <Input value={bookForm.cover_image} onChange={(e) => setBookForm({ ...bookForm, cover_image: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={editingBook ? handleUpdateBook : handleAddBook}>
                      {editingBook ? "Update" : "Add"} Book
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {books.map((book) => (
                <Card key={book.id}>
                  <CardContent className="flex items-center gap-4 pt-6">
                    <img src={book.cover_image || "/placeholder.svg"} alt={book.title} className="w-16 h-24 object-cover rounded" />
                    <div className="flex-1">
                      <h3 className="font-heading font-semibold">{book.title}</h3>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                      <p className="text-xs text-muted-foreground">ISBN: {book.isbn}</p>
                      <Badge variant="secondary" className="mt-1">{book.categories?.name}</Badge>
                      <p className="text-sm font-medium mt-2">
                        Copies available: {Math.max(0, DEFAULT_TOTAL_COPIES - (borrowedCounts[book.id] || 0))}
                      </p>
                    </div>
                    <Badge variant={book.status === "Available" ? "default" : book.status === "Unavailable" ? "destructive" : "secondary"}>
                      {book.status}
                    </Badge>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(book)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteBook(book.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Categories Management */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-heading font-bold">Manage Categories</h2>
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                  </DialogHeader>
                  <div>
                    <Label>Category Name</Label>
                    <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ name: e.target.value })} />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddCategory}>Add Category</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle>{category.name}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Requests Management */}
          <TabsContent value="requests">
            <h2 className="text-2xl font-heading font-bold mb-6">Pending Requests</h2>
            <div className="grid gap-8">
              <div>
                <h3 className="text-lg font-heading font-semibold mb-3">Borrow Requests</h3>
                <div className="grid gap-4">
                  {requests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="flex items-center gap-4 pt-6">
                        <div className="flex-1">
                          <h3 className="font-heading font-semibold">{request.books?.title}</h3>
                          <p className="text-sm text-muted-foreground">{request.books?.author}</p>
                          <p className="text-xs text-muted-foreground mt-1">Requested by: {request.requester?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">Date: {new Date(request.requested_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApproveRequest(request.id, request.book_id, request.user_id)} disabled={requestActionLoadingId === request.id}>
                            <Check className="h-4 w-4 mr-1" />
                            {requestActionLoadingId === request.id ? "Approving..." : "Approve"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeclineRequest(request.id)} disabled={requestActionLoadingId === request.id}>
                            <X className="h-4 w-4 mr-1" />
                            {requestActionLoadingId === request.id ? "Declining..." : "Decline"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {requests.length === 0 && (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No pending borrow requests
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-heading font-semibold mb-3">Return Requests</h3>
                <div className="grid gap-4">
                  {pendingReturnRequests.map((request) => {
                    const borrowed = request.borrowed_books;
                    const dueDate = borrowed ? new Date(borrowed.due_date) : new Date();
                    const requestedAt = request.requested_at ? new Date(request.requested_at) : null;
                    return (
                      <Card key={request.id}>
                        <CardContent className="flex items-center gap-4 pt-6">
                          <div className="flex-1">
                            <h3 className="font-heading font-semibold">{borrowed?.books?.title}</h3>
                            <p className="text-sm text-muted-foreground">{borrowed?.books?.author}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Requested by: {borrowed?.profiles?.full_name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Due date: {dueDate.toLocaleDateString()}
                            </p>
                            {requestedAt && (
                              <p className="text-xs text-muted-foreground">
                                Return requested: {requestedAt.toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveReturn(request)}
                              disabled={returnActionLoadingId === request.id}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              {returnActionLoadingId === request.id ? "Processing..." : "Approve Return"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeclineReturn(request.id)}
                              disabled={returnActionLoadingId === request.id}
                            >
                              <X className="h-4 w-4 mr-1" />
                              {returnActionLoadingId === request.id ? "Processing..." : "Decline"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {pendingReturnRequests.length === 0 && (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No pending return requests
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Borrowed Books */}
          <TabsContent value="borrowed">
            <h2 className="text-2xl font-heading font-bold mb-4">Currently Borrowed Books</h2>
            <div className="grid gap-4">
              {borrowedBooks.map((borrowed) => {
                const dueDate = new Date(borrowed.due_date);
                const today = new Date();
                const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const dueFee = daysRemaining < 0 ? Math.abs(daysRemaining) * 10 : 0;

                return (
                  <Card key={borrowed.id}>
                    <CardContent className="flex items-center gap-4 pt-6">
                      <div className="flex-1">
                        <h3 className="font-heading font-semibold">{borrowed.books.title}</h3>
                        <p className="text-sm text-muted-foreground">{borrowed.books.author}</p>
                        <p className="text-xs text-muted-foreground mt-1">Borrowed by: {borrowed.profiles.full_name}</p>
                        <p className="text-xs text-muted-foreground">Due: {dueDate.toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={daysRemaining < 0 ? "destructive" : "default"}>
                          {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
                        </Badge>
                        {dueFee > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-destructive font-semibold">
                            <IndianRupee className="h-4 w-4" />
                            <span>{dueFee}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {borrowedBooks.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No borrowed books
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users">
            <h2 className="text-2xl font-heading font-bold mb-4">Manage Users</h2>
            <div className="grid gap-4">
              {users.map((user) => (
                <Card key={user.id}>
                  <CardContent className="flex items-center justify-between pt-6">
                    <div>
                      <h3 className="font-heading font-semibold">{user.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
