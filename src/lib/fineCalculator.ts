export interface FineCalculation {
  totalFine: number;
  daysOverdue: number;
  dailyRate: number;
  isOverdue: boolean;
}

export const calculateFine = (dueDate: string, returnDate?: string, dailyRate: number = 10): FineCalculation => {
  const due = new Date(dueDate);
  const today = returnDate ? new Date(returnDate) : new Date();
  const daysOverdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
  const totalFine = daysOverdue * dailyRate;
  const isOverdue = daysOverdue > 0;

  return {
    totalFine,
    daysOverdue,
    dailyRate,
    isOverdue
  };
};

export const updateBorrowedBooksFines = async (supabase: any) => {
  try {
    // Get all overdue books that haven't been returned
    const { data: overdueBooks, error } = await supabase
      .from('borrowed_books')
      .select('*')
      .is('return_date', null)
      .lt('due_date', new Date().toISOString());

    if (error) throw error;

    // Update fines for each overdue book
    for (const book of overdueBooks || []) {
      const fine = calculateFine(book.due_date);
      
      await supabase
        .from('borrowed_books')
        .update({
          total_fine: fine.totalFine,
          last_fine_update: new Date().toISOString()
        })
        .eq('id', book.id);
    }

    return { success: true, updated: overdueBooks?.length || 0 };
  } catch (error) {
    console.error('Error updating fines:', error);
    return { success: false, error };
  }
};