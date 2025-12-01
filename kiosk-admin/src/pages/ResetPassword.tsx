import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, message, Space, Spin } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase';
import './Auth.css';

const { Title, Text } = Typography;

const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [form] = Form.useForm();

    // 상태 관리
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    // 비밀번호 재설정 모드 (링크 타고 들어왔을 때)
    const [oobCode, setOobCode] = useState<string | null>(null);
    const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    // URL 파라미터 확인 (oobCode)
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get('oobCode');

        if (code) {
            setOobCode(code);
            setVerifying(true);
            // 코드 유효성 검사
            verifyPasswordResetCode(auth, code)
                .then((email) => {
                    setVerifiedEmail(email);
                    setVerifying(false);
                })
                .catch((error) => {
                    console.error('Invalid code:', error);
                    message.error('유효하지 않거나 만료된 링크입니다.');
                    setVerifying(false);
                    // 실패 시 다시 이메일 입력 화면으로 (oobCode 제거)
                    setOobCode(null);
                });
        }
    }, [location.search]);

    // 1. 이메일 발송 핸들러
    const handleSendEmail = async (values: any) => {
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, values.email, {
                url: `${window.location.origin}/reset-password`, // 현재 페이지로 리다이렉트
                handleCodeInApp: true,
            });
            setEmailSent(true);
            message.success('비밀번호 재설정 이메일이 발송되었습니다!');
        } catch (error: any) {
            console.error('Email send error:', error);
            let errorMessage = '이메일 발송에 실패했습니다.';
            if (error.code === 'auth/user-not-found') {
                errorMessage = '등록되지 않은 이메일입니다.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = '유효하지 않은 이메일 형식입니다.';
            }
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // 2. 비밀번호 변경 핸들러
    const handleResetPassword = async (values: any) => {
        if (!oobCode) return;

        setLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode, values.newPassword);
            message.success('비밀번호가 성공적으로 변경되었습니다! 로그인해주세요.');
            navigate('/login');
        } catch (error: any) {
            console.error('Password reset error:', error);
            message.error('비밀번호 변경 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    // 렌더링: 검증 중일 때
    if (verifying) {
        return (
            <div className="auth-container">
                <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 20 }}>링크를 확인하는 중입니다...</div>
                </div>
            </div>
        );
    }

    // 렌더링: 비밀번호 변경 모드 (링크 타고 들어왔고 검증 성공)
    if (oobCode && verifiedEmail) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
                        <Title level={2} className="auth-title">비밀번호 변경</Title>
                        <p className="auth-subtitle">{verifiedEmail} 계정의<br />새로운 비밀번호를 설정해주세요.</p>
                    </div>

                    <Form form={form} onFinish={handleResetPassword} layout="vertical" size="large">
                        <Form.Item
                            name="newPassword"
                            rules={[
                                { required: true, message: '새 비밀번호를 입력해주세요!' },
                                { min: 6, message: '비밀번호는 6자리 이상이어야 합니다.' }
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="새 비밀번호 (6자리 이상)" />
                        </Form.Item>

                        <Form.Item
                            name="confirmPassword"
                            dependencies={['newPassword']}
                            rules={[
                                { required: true, message: '비밀번호를 한번 더 입력해주세요!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('비밀번호가 일치하지 않습니다!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="새 비밀번호 확인" />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="auth-button" loading={loading}>
                                비밀번호 변경하기
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </div>
        );
    }

    // 렌더링: 이메일 입력 모드 (기본 화면)
    return (
        <div className="auth-container">
            <div className="auth-card">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔑</div>
                    <Title level={2} className="auth-title">비밀번호 재설정</Title>
                    <p className="auth-subtitle">가입한 이메일 주소를 입력하시면<br />재설정 링크를 보내드립니다.</p>
                </div>

                {!emailSent ? (
                    <Form onFinish={handleSendEmail} layout="vertical" size="large">
                        <Form.Item
                            name="email"
                            rules={[{ required: true, message: '이메일을 입력해주세요!', type: 'email' }]}
                        >
                            <Input prefix={<MailOutlined />} placeholder="이메일 주소" />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="auth-button" loading={loading}>
                                인증 메일 발송
                            </Button>
                        </Form.Item>

                        <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
                            <Button type="link" onClick={() => navigate('/login')} className="auth-link-button">
                                로그인 페이지로 돌아가기
                            </Button>
                        </Form.Item>
                    </Form>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            background: '#f6ffed',
                            border: '1px solid #b7eb8f',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <Title level={4} style={{ color: '#52c41a', marginTop: 0 }}>메일 발송 완료!</Title>
                            <Text>
                                이메일함을 확인해주세요.<br />
                                메일에 포함된 링크를 클릭하면<br />
                                비밀번호를 변경할 수 있습니다.
                            </Text>
                        </div>
                        <Button type="default" onClick={() => setEmailSent(false)}>
                            이메일 다시 입력하기
                        </Button>
                        <div style={{ marginTop: '16px' }}>
                            <Button type="link" onClick={() => navigate('/login')}>
                                로그인 페이지로 돌아가기
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
