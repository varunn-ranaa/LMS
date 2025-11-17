// app/api/send-reminder/route.ts
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, userName, bookTitle, dueDate, daysRemaining } = await request.json();

    const { data, error } = await resend.emails.send({
      from: 'Library <notifications@yourdomain.com>',
      to: email,
      subject: `📚 Book Due Reminder: ${bookTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Library Book Due Reminder</h2>
          <p>Hello ${userName},</p>
          <p>This is a friendly reminder that your borrowed book <strong>"${bookTitle}"</strong> is due in <strong>${daysRemaining} day(s)</strong>.</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
            <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
          </div>
          <p>Please return the book on or before the due date to avoid late fees.</p>
          <p>Thank you for using our library!</p>
          <hr style="margin: 24px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}