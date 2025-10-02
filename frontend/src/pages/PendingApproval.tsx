import React from 'react';
import { Clock, Mail, AlertCircle } from 'lucide-react';

const PendingApproval: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-yellow-100 p-4 rounded-full">
              <Clock className="h-12 w-12 text-yellow-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            권한 할당 대기 중
          </h1>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm text-gray-700">
                  현재 귀하의 계정은 승인되었으나, 아직 권한 그룹이 할당되지 않았습니다.
                </p>
              </div>
            </div>
          </div>

          <p className="text-gray-600 mb-6">
            시스템 사용을 위해서는 관리자의 권한 할당이 필요합니다.
            <br />
            빠른 처리를 위해 관리자에게 문의해 주세요.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <Mail className="h-5 w-5 text-gray-500 mr-2" />
              <span className="font-medium text-gray-700">관리자 연락처</span>
            </div>
            <p className="text-sm text-gray-600">
              이메일: admin@biocom.kr
              <br />
              전화: 02-1234-5678
            </p>
          </div>

          <div className="text-sm text-gray-500">
            권한이 할당되면 자동으로 시스템에 접근할 수 있습니다.
            <br />
            페이지를 새로고침하여 상태를 확인해 주세요.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;