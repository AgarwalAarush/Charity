import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EmailService } from '@/services/EmailService'

export async function POST(request: NextRequest) {
  try {
    const { emailData } = await request.json()

    if (!emailData || !emailData.to || !emailData.subject || !emailData.body) {
      return NextResponse.json(
        { error: 'Missing required email fields' },
        { status: 400 }
      )
    }

    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Send email using EmailService (server-side, has access to RESEND_API_KEY)
    const result = await EmailService.send(emailData)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to send email' 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    })
  } catch (error) {
    console.error('Error sending team invitation email:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


