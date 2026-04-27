import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { COMPANY } from '@/lib/data'

export async function POST(req: NextRequest) {
  const { facture, to, html } = await req.json()

  if (!to || !html || !facture) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const host     = process.env.EMAIL_HOST     || 'smtp.gmail.com'
  const port     = parseInt(process.env.EMAIL_PORT || '587')
  const user     = process.env.EMAIL_USER     || ''
  const pass     = process.env.EMAIL_PASS     || ''
  const fromName = process.env.EMAIL_FROM_NAME || 'Dreamwash'

  if (!user || !pass) {
    return NextResponse.json({ error: 'SMTP not configured' }, { status: 500 })
  }

  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to,
      subject: `Votre facture ${facture.numero} — Dreamwash`,
      html,
      text: `Votre facture ${facture.numero} est disponible. Total TTC: ${facture.vente?.totalTTC?.toFixed(2)} €\n\n${COMPANY.nom} · ${COMPANY.adresse}\n${COMPANY.telephone}`,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Email error:', err)
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }
}
