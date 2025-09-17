import toast, { ToastOptions } from 'react-hot-toast';

// 통일된 토스트 스타일 설정
const defaultOptions: Partial<ToastOptions> = {
  duration: 4000,
  position: 'top-center',
  style: {
    padding: '16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    maxWidth: '500px',
  },
};

// 성공 토스트
export const showSuccess = (message: string, options?: Partial<ToastOptions>) => {
  return toast.success(message, {
    ...defaultOptions,
    ...options,
    style: {
      ...defaultOptions.style,
      background: '#10B981',
      color: '#fff',
      ...options?.style,
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10B981',
    },
  });
};

// 에러 토스트
export const showError = (message: string, options?: Partial<ToastOptions>) => {
  return toast.error(message, {
    ...defaultOptions,
    ...options,
    style: {
      ...defaultOptions.style,
      background: '#EF4444',
      color: '#fff',
      ...options?.style,
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#EF4444',
    },
  });
};

// 경고 토스트
export const showWarning = (message: string, options?: Partial<ToastOptions>) => {
  return toast(message, {
    ...defaultOptions,
    ...options,
    style: {
      ...defaultOptions.style,
      background: '#F59E0B',
      color: '#fff',
      ...options?.style,
    },
  });
};

// 정보 토스트
export const showInfo = (message: string, options?: Partial<ToastOptions>) => {
  return toast(message, {
    ...defaultOptions,
    ...options,
    style: {
      ...defaultOptions.style,
      background: '#3B82F6',
      color: '#fff',
      ...options?.style,
    },
  });
};

// 로딩 토스트
export const showLoading = (message: string, options?: Partial<ToastOptions>) => {
  return toast.loading(message, {
    ...defaultOptions,
    ...options,
    style: {
      ...defaultOptions.style,
      background: '#6B7280',
      color: '#fff',
      ...options?.style,
    },
  });
};

// Promise 기반 토스트 (비동기 작업용)
export const showPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: any) => string);
  },
  options?: Partial<ToastOptions>
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      ...defaultOptions,
      ...options,
      style: {
        ...defaultOptions.style,
        ...options?.style,
      },
      success: {
        style: {
          background: '#10B981',
          color: '#fff',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#10B981',
        },
      },
      error: {
        style: {
          background: '#EF4444',
          color: '#fff',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#EF4444',
        },
      },
      loading: {
        style: {
          background: '#6B7280',
          color: '#fff',
        },
      },
    }
  );
};

// 토스트 닫기
export const dismissToast = (toastId?: string) => {
  if (toastId) {
    toast.dismiss(toastId);
  } else {
    toast.dismiss();
  }
};

// 커스텀 토스트 (직접 스타일링이 필요한 경우)
export const showCustom = (
  message: string | React.ReactNode,
  options?: Partial<ToastOptions>
) => {
  return toast(message, {
    ...defaultOptions,
    ...options,
  });
};

// 기본 export (원본 toast 객체가 필요한 경우)
export default toast;