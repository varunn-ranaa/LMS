# Library Management System

A modern, full-featured library management system built with React, TypeScript, and Supabase.

## Features

- **User Authentication**: Secure sign-in and sign-up functionality
- **Admin Dashboard**: Manage library resources and track operations
- **Student Portal**: Browse books, manage requests, and track returns
- **Fine Management**: Automatic calculation and tracking of overdue fines
- **Return Requests**: Students can request and manage book returns
- **Real-time Updates**: Powered by Supabase for instant data synchronization
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS

## Technology Stack

- **Frontend**: React 19+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Form Management**: React Hook Form
- **UI Components**: Shadcn/ui
- **Package Manager**: Bun

## Project Structure

```
src/
├── components/        # React components and UI elements
├── pages/            # Application pages
├── hooks/            # Custom React hooks
├── api/              # API route handlers
├── lib/              # Utility functions and helpers
├── config/           # Configuration files
├── integrations/     # External service integrations
└── assets/           # Static assets

supabase/            # Database configuration and migrations
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/varunn-ranaa/LMS.git
cd library-management-sys
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Set up environment variables:
Create a `.env.local` file with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
bun dev
# or
npm run dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- `bun dev` - Start development server
- `bun build` - Build for production
- `bun preview` - Preview production build
- `bun lint` - Run ESLint

## Key Features

### Authentication
- Student and admin authentication flows
- Secure credential management
- Session persistence

### Book Management
- Browse library catalog
- Search and filter books
- Request books
- Track lending history

### Fine System
- Automatic fine calculation for overdue books
- Fine tracking and payment status
- Reminder notifications

### Admin Controls
- Dashboard for managing system operations
- User management
- Book inventory management
- Fine and penalty configuration

## Database Schema

The project uses Supabase (PostgreSQL) with the following main tables:

- **Users**: Authentication and profile information
- **Books**: Library catalog
- **Loans**: Book lending records
- **ReturnRequests**: Book return requests
- **Fines**: Overdue fine tracking

See `supabase/migrations/` for detailed schema definitions.

## Configuration

### Admin Credentials
Admin default credentials are defined in `src/config/adminCredentials.ts`

### Fine Calculator
Fine calculation logic is implemented in `src/lib/fineCalculator.ts`

## Known Issues & Limitations

### Current Limitations
- ⚠️ **Email Notifications**: Reminder email functionality is partially implemented and may not work reliably
- ⚠️ **Payment Gateway Integration**: Fine payment integration is not yet implemented
- ⚠️ **Book Search**: Advanced search filters are limited; full-text search not available
- ⚠️ **Barcode Scanning**: Barcode/QR code scanning for book management is not implemented
- ⚠️ **Batch Operations**: Admin cannot perform bulk operations on multiple books
- ⚠️ **Fine Waiver**: No grace period or fine waiver system for special cases
- ⚠️ **Report Generation**: PDF and Excel report generation features are missing
- ⚠️ **Mobile App**: Currently web-only; native mobile app not available
- ⚠️ **User Profile Images**: Profile picture upload functionality not implemented
- ⚠️ **Book Reviews & Ratings**: User review and rating system not available

### Performance Considerations
- Large datasets (10,000+ books) may impact search performance
- Real-time notifications may have latency issues with high concurrent users
- Media files are not optimized for large uploads

### Security Notes
- Environment variables must be properly configured for production
- Default admin credentials should be changed immediately
- CORS settings need to be configured for production deployment

## Future Enhancements

### Phase 1 (High Priority)
- [ ] **Email Notifications**: Implement reliable email reminders for due dates and overdue books
- [ ] **Payment Gateway**: Integrate Stripe or PayPal for online fine payments
- [ ] **Advanced Search**: Full-text search with filters (author, genre, publication date, etc.)
- [ ] **User Profile Management**: Allow users to update profile information and profile pictures
- [ ] **Book Reviews**: Add user review and rating system for books

### Phase 2 (Medium Priority)
- [ ] **Barcode/QR Code**: Implement barcode scanning for quick book checkout and return
- [ ] **Report Generation**: Create PDF and Excel reports for admin (circulation, fines, etc.)
- [ ] **Batch Operations**: Bulk import/export and management of books
- [ ] **Fine Waiver System**: Implement grace periods and manual fine waiver approvals
- [ ] **SMS Notifications**: Add SMS reminders for overdue books
- [ ] **Book Recommendations**: AI-based book recommendation system

### Phase 3 (Nice to Have)
- [ ] **Mobile App**: Native iOS and Android applications
- [ ] **Hold System**: Students can reserve/hold books that are currently checked out
- [ ] **Book History**: Detailed borrowing history and analytics for each user
- [ ] **Fine Analytics**: Advanced analytics dashboard for fine patterns and revenue tracking
- [ ] **Multi-Library Support**: Support for multiple library branches
- [ ] **Digital Books**: Support for e-books and digital resources
- [ ] **Late Fee Customization**: Configurable fine calculation rules per library policy

### Technical Improvements
- [ ] Implement caching for frequently accessed data
- [ ] Add comprehensive error handling and logging
- [ ] Implement API rate limiting
- [ ] Add unit and integration tests
- [ ] Improve TypeScript type coverage
- [ ] Implement dark mode support
- [ ] Add accessibility (a11y) improvements
- [ ] Database query optimization and indexing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Support

open an issue on GitHub.

---

**Project Owner**: varunn-ranaa  
**Repository**: [LMS](https://github.com/varunn-ranaa/LMS)
=======

>>>>>>> 11abb92d79ef90535aafbcb7db3274de44d2b326
