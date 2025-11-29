import nodemailer from 'nodemailer';

// SMTP 설정
// service: 'gmail'을 사용하면 host, port 등을 자동으로 설정해줍니다.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // 연결 안정성 및 디버깅을 위한 추가 설정
  connectionTimeout: 30000, // 30초로 증가
  greetingTimeout: 30000,
  socketTimeout: 30000,
  debug: true, // 상세 로그 출력
  logger: true, // 로거 활성화
});

// 환경 변수 로드 확인 (디버깅용)
console.log('Email Config Check:', {
  user: process.env.EMAIL_USER ? 'Set' : 'Not Set',
  pass: process.env.EMAIL_PASS ? 'Set' : 'Not Set',
});

/**
 * 이메일 인증 코드를 발송하는 함수
 * @param to 받는 사람 이메일 주소
 * @param code 6자리 인증 번호
 */
export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const senderName = process.env.EMAIL_SENDER_NAME || 'OPTIMA ORDER';

  const mailOptions = {
    from: `"${senderName}" <${process.env.EMAIL_USER}>`,
    to,
    subject: '[OPTIMA ORDER] 이메일 인증 코드',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
          이메일 인증 코드
        </h2>
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          안녕하세요,<br>
          요청하신 이메일 인증 코드는 다음과 같습니다:
        </p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px;">
            ${code}
          </span>
        </div>
        <p style="font-size: 14px; color: #777;">
          이 코드는 <strong>5분간 유효</strong>합니다.<br>
          본인이 요청하지 않았다면 이 이메일을 무시하셔도 됩니다.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          © ${new Date().getFullYear()} OPTIMA ORDER. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ 인증 이메일 발송 성공: ${to}`);
  } catch (error) {
    console.error('❌ 이메일 발송 실패:', error);
    throw new Error('이메일 발송에 실패했습니다.');
  }
}

/**
 * 6자리 랜덤 인증 코드 생성
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
