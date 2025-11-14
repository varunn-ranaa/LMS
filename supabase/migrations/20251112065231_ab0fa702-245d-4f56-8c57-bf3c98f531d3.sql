-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create books table
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  isbn TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Borrowed')),
  cover_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Create book requests table
CREATE TABLE public.book_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Declined')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

-- Create borrowed books table
CREATE TABLE public.borrowed_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.book_requests(id) ON DELETE SET NULL,
  issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ,
  due_fee DECIMAL(10, 2) DEFAULT 0,
  fee_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.borrowed_books ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = _role
  )
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    'user'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for categories
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for books
CREATE POLICY "Anyone can view books"
  ON public.books FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage books"
  ON public.books FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for book requests
CREATE POLICY "Users can view own requests"
  ON public.book_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all requests"
  ON public.book_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create requests"
  ON public.book_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update requests"
  ON public.book_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for borrowed books
CREATE POLICY "Users can view own borrowed books"
  ON public.borrowed_books FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all borrowed books"
  ON public.borrowed_books FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage borrowed books"
  ON public.borrowed_books FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert categories
INSERT INTO public.categories (name) VALUES
  ('Science'),
  ('Fiction'),
  ('Mathematics'),
  ('History'),
  ('Technology'),
  ('Literature');

-- Insert books with their data
INSERT INTO public.books (title, author, category_id, isbn, cover_image)
SELECT 
  'A Brief History of Time',
  'Stephen Hawking',
  (SELECT id FROM public.categories WHERE name = 'Science'),
  '9780553380163',
  'https://covers.openlibrary.org/b/id/240726-M.jpg'
UNION ALL SELECT 'The Selfish Gene', 'Richard Dawkins', (SELECT id FROM public.categories WHERE name = 'Science'), '9780198788607', 'https://covers.openlibrary.org/b/id/12603924-M.jpg'
UNION ALL SELECT 'Cosmos', 'Carl Sagan', (SELECT id FROM public.categories WHERE name = 'Science'), '9780345539434', 'https://covers.openlibrary.org/b/id/8231856-M.jpg'
UNION ALL SELECT 'The Origin of Species', 'Charles Darwin', (SELECT id FROM public.categories WHERE name = 'Science'), '9781509827695', 'https://covers.openlibrary.org/b/id/8235080-M.jpg'
UNION ALL SELECT 'The Gene: An Intimate History', 'Siddhartha Mukherjee', (SELECT id FROM public.categories WHERE name = 'Science'), '9781476733500', 'https://covers.openlibrary.org/b/id/8231493-M.jpg'
UNION ALL SELECT 'Silent Spring', 'Rachel Carson', (SELECT id FROM public.categories WHERE name = 'Science'), '9780618249060', 'https://covers.openlibrary.org/b/id/8226195-M.jpg'
UNION ALL SELECT 'To Kill a Mockingbird', 'Harper Lee', (SELECT id FROM public.categories WHERE name = 'Fiction'), '9780061120084', 'https://covers.openlibrary.org/b/id/8225261-M.jpg'
UNION ALL SELECT 'The Great Gatsby', 'F. Scott Fitzgerald', (SELECT id FROM public.categories WHERE name = 'Fiction'), '9780743273565', 'https://covers.openlibrary.org/b/id/7222246-M.jpg'
UNION ALL SELECT 'The Hobbit', 'J.R.R. Tolkien', (SELECT id FROM public.categories WHERE name = 'Fiction'), '9780547928227', 'https://covers.openlibrary.org/b/id/6979861-M.jpg'
UNION ALL SELECT '1984', 'George Orwell', (SELECT id FROM public.categories WHERE name = 'Fiction'), '9780451524935', 'https://covers.openlibrary.org/b/id/7222243-M.jpg'
UNION ALL SELECT 'The Catcher in the Rye', 'J.D. Salinger', (SELECT id FROM public.categories WHERE name = 'Fiction'), '9780316769488', 'https://covers.openlibrary.org/b/id/8231996-M.jpg'
UNION ALL SELECT 'Pride and Prejudice', 'Jane Austen', (SELECT id FROM public.categories WHERE name = 'Fiction'), '9780141040349', 'https://covers.openlibrary.org/b/id/8081536-M.jpg'
UNION ALL SELECT 'The Man Who Knew Infinity', 'Robert Kanigel', (SELECT id FROM public.categories WHERE name = 'Mathematics'), '9781476763491', 'https://covers.openlibrary.org/b/id/8115018-M.jpg'
UNION ALL SELECT 'Flatland', 'Edwin A. Abbott', (SELECT id FROM public.categories WHERE name = 'Mathematics'), '9780140435313', 'https://covers.openlibrary.org/b/id/8235305-M.jpg'
UNION ALL SELECT 'Calculus Made Easy', 'Silvanus P. Thompson', (SELECT id FROM public.categories WHERE name = 'Mathematics'), '9781463740518', 'https://covers.openlibrary.org/b/id/8234153-M.jpg'
UNION ALL SELECT 'Fermat''s Enigma', 'Simon Singh', (SELECT id FROM public.categories WHERE name = 'Mathematics'), '9780385319466', 'https://covers.openlibrary.org/b/id/8224811-M.jpg'
UNION ALL SELECT 'The Joy of x', 'Steven Strogatz', (SELECT id FROM public.categories WHERE name = 'Mathematics'), '9780544105850', 'https://covers.openlibrary.org/b/id/8231323-M.jpg'
UNION ALL SELECT 'How Not to Be Wrong', 'Jordan Ellenberg', (SELECT id FROM public.categories WHERE name = 'Mathematics'), '9780143127536', 'https://covers.openlibrary.org/b/id/8232685-M.jpg'
UNION ALL SELECT 'Sapiens: A Brief History of Humankind', 'Yuval Noah Harari', (SELECT id FROM public.categories WHERE name = 'History'), '9780062316097', 'https://covers.openlibrary.org/b/id/8232701-M.jpg'
UNION ALL SELECT 'Guns, Germs, and Steel', 'Jared Diamond', (SELECT id FROM public.categories WHERE name = 'History'), '9780393354324', 'https://covers.openlibrary.org/b/id/8231715-M.jpg'
UNION ALL SELECT 'The Silk Roads', 'Peter Frankopan', (SELECT id FROM public.categories WHERE name = 'History'), '9781408839997', 'https://covers.openlibrary.org/b/id/8225798-M.jpg'
UNION ALL SELECT 'Team of Rivals', 'Doris Kearns Goodwin', (SELECT id FROM public.categories WHERE name = 'History'), '9780684824901', 'https://covers.openlibrary.org/b/id/8234868-M.jpg'
UNION ALL SELECT 'The Diary of a Young Girl', 'Anne Frank', (SELECT id FROM public.categories WHERE name = 'History'), '9780553296983', 'https://covers.openlibrary.org/b/id/8232571-M.jpg'
UNION ALL SELECT 'The Wright Brothers', 'David McCullough', (SELECT id FROM public.categories WHERE name = 'History'), '9781476728742', 'https://covers.openlibrary.org/b/id/8231772-M.jpg'
UNION ALL SELECT 'Clean Code', 'Robert C. Martin', (SELECT id FROM public.categories WHERE name = 'Technology'), '9780132350884', 'https://covers.openlibrary.org/b/id/8235171-M.jpg'
UNION ALL SELECT 'The Pragmatic Programmer', 'Andrew Hunt, David Thomas', (SELECT id FROM public.categories WHERE name = 'Technology'), '9780201616224', 'https://covers.openlibrary.org/b/id/8235090-M.jpg'
UNION ALL SELECT 'Code: The Hidden Language of Computer Hardware and Software', 'Charles Petzold', (SELECT id FROM public.categories WHERE name = 'Technology'), '9780735611313', 'https://covers.openlibrary.org/b/id/8226629-M.jpg'
UNION ALL SELECT 'AI Superpowers', 'Kai-Fu Lee', (SELECT id FROM public.categories WHERE name = 'Technology'), '9781328546395', 'https://covers.openlibrary.org/b/id/8232802-M.jpg'
UNION ALL SELECT 'Deep Learning', 'Ian Goodfellow, Yoshua Bengio, Aaron Courville', (SELECT id FROM public.categories WHERE name = 'Technology'), '9780262035613', 'https://covers.openlibrary.org/b/id/8235184-M.jpg'
UNION ALL SELECT 'The Innovators', 'Walter Isaacson', (SELECT id FROM public.categories WHERE name = 'Technology'), '9781476708690', 'https://covers.openlibrary.org/b/id/8235053-M.jpg'
UNION ALL SELECT 'Hamlet', 'William Shakespeare', (SELECT id FROM public.categories WHERE name = 'Literature'), '9780743477123', 'https://covers.openlibrary.org/b/id/8232724-M.jpg'
UNION ALL SELECT 'The Odyssey', 'Homer', (SELECT id FROM public.categories WHERE name = 'Literature'), '9780140268867', 'https://covers.openlibrary.org/b/id/8232993-M.jpg'
UNION ALL SELECT 'The Divine Comedy', 'Dante Alighieri', (SELECT id FROM public.categories WHERE name = 'Literature'), '9780142437223', 'https://covers.openlibrary.org/b/id/8235050-M.jpg'
UNION ALL SELECT 'Don Quixote', 'Miguel de Cervantes', (SELECT id FROM public.categories WHERE name = 'Literature'), '9780060934347', 'https://covers.openlibrary.org/b/id/8232689-M.jpg'
UNION ALL SELECT 'Crime and Punishment', 'Fyodor Dostoevsky', (SELECT id FROM public.categories WHERE name = 'Literature'), '9780143107637', 'https://covers.openlibrary.org/b/id/8234853-M.jpg'
UNION ALL SELECT 'Jane Eyre', 'Charlotte Brontë', (SELECT id FROM public.categories WHERE name = 'Literature'), '9780141441146', 'https://covers.openlibrary.org/b/id/8232807-M.jpg';