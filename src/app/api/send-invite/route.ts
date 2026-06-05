import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email, firstName, lastName, role, confirmationLink } = await request.json();

    if (!email || !firstName || !lastName || !role || !confirmationLink) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes.' },
        { status: 400 }
      );
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPass = process.env.GMAIL_APP_PASS;

    if (!gmailUser || !gmailAppPass) {
      return NextResponse.json(
        { error: 'Configuração ausente: GMAIL_USER ou GMAIL_APP_PASS não configuradas no servidor (.env.local).' },
        { status: 400 }
      );
    }

    // Configure Nodemailer transporter for Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPass,
      },
    });

    const htmlContent = `
      <div style="background-color: #000000; color: #e4e4e7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; border-radius: 24px; max-width: 500px; margin: 0 auto; border: 1px solid #1f1f22;">
        <div style="border-bottom: 1px solid #1f1f22; padding-bottom: 20px; margin-bottom: 25px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 800; letter-spacing: -0.05em; font-family: monospace;">TALOS CRM</h1>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #d4d4d8; margin-bottom: 16px;">
          Olá, <strong>${firstName} ${lastName}</strong>!
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #a1a1aa; margin-bottom: 24px;">
          Você foi convidado para integrar a equipe como <strong>${role}</strong>. Para aceitar este convite e ativar sua conta de funcionário, clique no botão abaixo:
        </p>
        <div style="text-align: center; margin-bottom: 30px; margin-top: 30px;">
          <a href="${confirmationLink}" style="background-color: #ffffff; color: #000000; padding: 14px 30px; border-radius: 16px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px; transition: all 0.2s;">
            Aceitar e Confirmar Convite
          </a>
        </div>
        <p style="font-size: 11px; line-height: 1.6; color: #52525b; border-top: 1px solid #1f1f22; padding-top: 20px; margin-top: 25px;">
          Se o botão acima não funcionar, copie e cole o seguinte link no seu navegador:<br/>
          <a href="${confirmationLink}" style="color: #a1a1aa; text-decoration: underline; word-break: break-all;">${confirmationLink}</a>
        </p>
      </div>
    `;

    // Send the mail
    await transporter.sendMail({
      from: `"Talos CRM" <${gmailUser}>`,
      to: email,
      subject: 'Convite de Trabalho - Equipe Talos CRM',
      html: htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Send Invite API Route Error:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno ao processar envio do e-mail.' },
      { status: 500 }
    );
  }
}
