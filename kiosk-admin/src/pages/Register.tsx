import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, message, Space } from 'antd';
import { MailOutlined, LockOutlined, ShopOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './Auth.css';

const { Title } = Typography;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState(''); // 인증 코드를 state에 저장

  // 타이머 카운트다운
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // 인증 코드 발송
  const handleSendCode = async () => {
    const email = form.getFieldValue('email');

    if (!email) {
      message.warning('이메일을 먼저 입력해주세요!');
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      message.error('올바른 이메일 형식을 입력해주세요!');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/send-code', { email });
      message.success('인증 코드가 이메일로 발송되었습니다!');
      setCodeSent(true);
      setTimer(300); // 5분 (300초)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '인증 코드 발송에 실패했습니다.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 인증 코드 검증
  const handleVerifyCode = async () => {
    const email = form.getFieldValue('email');
    const code = form.getFieldValue('verificationCode');

    if (!code) {
      message.warning('인증 코드를 입력해주세요!');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/verify-code', { email, code });
      message.success('이메일 인증이 완료되었습니다! ✅');
      setVerificationCode(code); // ✅ 인증 코드를 state에 저장
      setVerified(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '인증 코드가 일치하지 않습니다.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 회원가입
  const onFinish = async (values: any) => {
    if (!verified) {
      message.error('이메일 인증을 먼저 완료해주세요!');
      return;
    }

    try {
      await api.post('/auth/register', {
        email: values.email,
        password: values.password,
        storeName: values.storeName,
        verificationCode: verificationCode, // ✅ state에 저장된 인증 코드 사용
      });

      message.success('회원가입 성공! 로그인 페이지로 이동합니다.');
      navigate('/login');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '회원가입 중 오류가 발생했습니다.';
      message.error(errorMessage);
    }
  };

  // 타이머 포맷팅 (mm:ss)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
          <Title level={2} className="auth-title">OPTIMA | ORDER</Title>
          <p className="auth-subtitle">지금 바로 최적의 재고관리를 시작해보세요</p>
        </div>

        <Form form={form} name="register" onFinish={onFinish} layout="vertical" size="large">
          {/* 이메일 입력 + 인증 코드 발송 */}
          <Form.Item
            name="email"
            rules={[{ required: true, message: '이메일을 입력해주세요!', type: 'email' }]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                prefix={<MailOutlined />}
                placeholder="이메일 (로그인 ID)"
                disabled={verified}
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                onClick={handleSendCode}
                loading={loading}
                disabled={verified || (timer > 0)}
                style={{ minWidth: '120px' }}
              >
                {timer > 0 ? formatTime(timer) : codeSent ? '재발송' : '인증코드 발송'}
              </Button>
            </Space.Compact>
          </Form.Item>

          {/* 인증 코드 입력 + 검증 */}
          {codeSent && !verified && (
            <Form.Item
              name="verificationCode"
              rules={[{ required: true, message: '인증 코드를 입력해주세요!' }]}
            >
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="인증 코드 6자리"
                  maxLength={6}
                  style={{ flex: 1 }}
                />
                <Button
                  type="default"
                  onClick={handleVerifyCode}
                  loading={loading}
                  style={{ minWidth: '100px' }}
                >
                  인증 확인
                </Button>
              </Space.Compact>
            </Form.Item>
          )}

          {verified && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: '#f0f9ff',
              borderRadius: '8px',
              color: '#0369a1',
              textAlign: 'center',
              fontWeight: 500
            }}>
              ✅ 이메일 인증 완료!
            </div>
          )}

          <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력해주세요!' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
          </Form.Item>

          <Form.Item
            name="confirm"
            dependencies={['password']}
            rules={[
              { required: true, message: '비밀번호를 한번 더 입력해주세요!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('비밀번호가 일치하지 않습니다!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호 확인" />
          </Form.Item>

          <Form.Item name="storeName" rules={[{ required: true, message: '가게 이름을 입력해주세요!' }]}>
            <Input prefix={<ShopOutlined />} placeholder="가게 이름" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="auth-button" disabled={!verified}>
              회원가입
            </Button>
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Button type="link" onClick={() => navigate('/login')} className="auth-link-button">
              이미 계정이 있으신가요? <span style={{ fontWeight: 'bold' }}>로그인</span>
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Register;