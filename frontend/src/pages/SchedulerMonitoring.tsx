import React from 'react';
import { Clock } from 'lucide-react';
import { PageHeader } from '../components';

const SchedulerMonitoring: React.FC = () => {
  // 준비 중 화면을 표시
  return (
    <div className="p-6">
      <PageHeader
        title="스케줄러 모니터링"
        description="백그라운드 작업 실행 상태를 모니터링합니다"
      />

      <div className="mt-8 flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">준비 중입니다</h3>
          <p className="text-gray-500">스케줄러 모니터링 기능은 현재 개발 중입니다.</p>
          <p className="text-gray-500 mt-2">빠른 시일 내에 제공될 예정입니다.</p>
        </div>
      </div>
    </div>
  );
};

export default SchedulerMonitoring;