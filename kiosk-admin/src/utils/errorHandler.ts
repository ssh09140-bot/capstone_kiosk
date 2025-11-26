import { message } from 'antd';
import type { AxiosError } from 'axios';

/**
 * 백엔드 표준 에러 응답 타입
 */
export interface StandardErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
    };
    timestamp: string;
}

/**
 * 백엔드 표준 성공 응답 타입
 */
export interface Standard SuccessResponse < T = any > {
    success: true;
    data: T;
    timestamp: string;
}

/**
 * 에러 메시지 매핑 (한국어)
 */
const ERROR_MESSAGES: Record<string, string> = {
    // 인증 관련
    INVALID_TOKEN: '유효하지 않은 토큰입니다. 다시 로그인해주세요.',
    TOKEN_EXPIRED: '토큰이 만료되었습니다. 다시 로그인해주세요.',

    // 데이터베이스 관련
    DUPLICATE_ENTRY: '이미 존재하는 데이터입니다.',
    NOT_FOUND: '요청한 데이터를 찾을 수 없습니다.',

    // 일반 에러
    INTERNAL_SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    BAD_REQUEST: '잘못된 요청입니다.',
    UNAUTHORIZED: '인증이 필요합니다.',
    FORBIDDEN: '권한이 없습니다.',
};

/**
 * Axios 에러를 처리하고 사용자 친화적인 메시지를 반환
 */
export function handleApiError(error: any): string {
    // Axios 에러인 경우
    if (error.response) {
        const status = error.response.status;
        const data = error.response.data as StandardErrorResponse | any;

        // 표준 에러 응답 포맷인 경우
        if (data?.error?.code) {
            const { code, message: errorMsg } = data.error;
            return ERROR_MESSAGES[code] || errorMsg || '알 수 없는 오류가 발생했습니다.';
        }

        // 기존 포맷 (message 필드만 있는 경우)
        if (data?.message) {
            return data.message;
        }

        // HTTP 상태 코드 기반 메시지
        switch (status) {
            case 400:
                return '잘못된 요청입니다.';
            case 401:
                return '인증이 필요합니다. 다시 로그인해주세요.';
            case 403:
                return '권한이 없습니다.';
            case 404:
                return '요청한 리소스를 찾을 수 없습니다.';
            case 409:
                return '이미 존재하는 데이터입니다.';
            case 500:
                return '서버 오류가 발생했습니다.';
            default:
                return `오류가 발생했습니다. (코드: ${status})`;
        }
    }

    // 네트워크 에러
    if (error.request) {
        return '서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.';
    }

    // 기타 에러
    return error.message || '알 수 없는 오류가 발생했습니다.';
}

/**
 * API 에러를 처리하고 Ant Design message로 표시
 */
export function showApiError(error: any, defaultMessage?: string): void {
    const errorMessage = defaultMessage || handleApiError(error);
    message.error(errorMessage);
}

/**
 * 성공 메시지 표시
 */
export function showApiSuccess(msg: string): void {
    message.success(msg);
}

/**
 * 경고 메시지 표시
 */
export function showApiWarning(msg: string): void {
    message.warning(msg);
}

/**
 * 정보 메시지 표시
 */
export function showApiInfo(msg: string): void {
    message.info(msg);
}
