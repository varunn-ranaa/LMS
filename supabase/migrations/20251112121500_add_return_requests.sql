-- Create return requests table similar to borrow requests
CREATE TABLE public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  borrowed_book_id UUID NOT NULL REFERENCES public.borrowed_books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Declined')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

-- Prevent multiple pending return requests for the same borrowed book
CREATE UNIQUE INDEX return_requests_unique_pending
  ON public.return_requests (borrowed_book_id)
  WHERE status = 'Pending';

-- RLS policies
CREATE POLICY "Users can view own return requests"
  ON public.return_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create return requests"
  ON public.return_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.borrowed_books b
      WHERE b.id = borrowed_book_id
        AND b.user_id = auth.uid()
        AND b.return_date IS NULL
    )
  );

CREATE POLICY "Admins can view all return requests"
  ON public.return_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update return requests"
  ON public.return_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

