import React, { useState } from 'react';
import { Settings, User, Bell, Shield, Database, Globe } from 'lucide-react';
import {
  PageHeader,
  Button,
  TextField,
  SelectField,
  SwitchField,
  Alert
} from '../components';

interface SettingsPageProps {
  type: string;
}

function SettingsPage({ type }: SettingsPageProps) {
  const [saved, setSaved] = useState(false);

  const titles: Record<string, string> = {
    'settings-general': '일반 설정',
    'settings-users': '사용자 관리',
    'settings-notifications': '알림 설정'
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const renderContent = () => {
    switch(type) {
      case 'settings-general':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe size={20} />
                회사 정보
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="회사명"
                  name="companyName"
                  defaultValue="PLAYAUTO"
                />
                <TextField
                  label="사업자 번호"
                  name="businessNumber"
                  defaultValue="123-45-67890"
                />
                <TextField
                  label="대표자명"
                  name="ceoName"
                  defaultValue="홍길동"
                />
                <TextField
                  label="전화번호"
                  name="phone"
                  defaultValue="02-1234-5678"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database size={20} />
                데이터 설정
              </h3>
              <div className="space-y-4">
                <SelectField
                  label="기본 통화"
                  name="currency"
                  options={[
                    { value: 'KRW', label: '원화 (₩)' },
                    { value: 'USD', label: '달러 ($)' },
                    { value: 'EUR', label: '유로 (€)' }
                  ]}
                  defaultValue="KRW"
                />
                <SelectField
                  label="시간대"
                  name="timezone"
                  options={[
                    { value: 'Asia/Seoul', label: '서울 (GMT+9)' },
                    { value: 'America/New_York', label: '뉴욕 (GMT-5)' },
                    { value: 'Europe/London', label: '런던 (GMT+0)' }
                  ]}
                  defaultValue="Asia/Seoul"
                />
                <SwitchField
                  label="자동 백업 활성화"
                  name="autoBackup"
                  defaultChecked={true}
                />
              </div>
            </div>
          </div>
        );

      case 'settings-users':
        return (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User size={20} />
                사용자 목록
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {['관리자', '일반 사용자', '게스트'].map((role) => (
                  <div key={role} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{role}</p>
                      <p className="text-sm text-gray-500">user@example.com</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">편집</Button>
                      <Button size="sm" variant="outline">권한 설정</Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button icon={User}>새 사용자 추가</Button>
              </div>
            </div>
          </div>
        );

      case 'settings-notifications':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Bell size={20} />
              알림 설정
            </h3>
            <div className="space-y-4">
              <SwitchField
                label="재고 부족 알림"
                name="stockAlert"
                defaultChecked={true}
                hint="재고가 최소 수량 이하로 떨어질 때 알림을 받습니다"
              />
              <SwitchField
                label="일일 리포트"
                name="dailyReport"
                defaultChecked={false}
                hint="매일 오전 9시에 일일 재고 리포트를 이메일로 받습니다"
              />
              <SwitchField
                label="거래 알림"
                name="transactionAlert"
                defaultChecked={true}
                hint="새로운 입고/출고 거래가 발생할 때 알림을 받습니다"
              />
              <SwitchField
                label="시스템 알림"
                name="systemAlert"
                defaultChecked={true}
                hint="시스템 업데이트 및 유지보수 알림을 받습니다"
              />
              
              <div className="pt-4 border-t">
                <TextField
                  label="알림 이메일"
                  name="notificationEmail"
                  type="email"
                  defaultValue="admin@playauto.com"
                  hint="알림을 받을 이메일 주소를 입력하세요"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title={titles[type] || '설정'}
        icon={Settings}
        actions={
          <Button onClick={handleSave}>저장</Button>
        }
      />

      {saved && (
        <Alert
          type="success"
          message="설정이 성공적으로 저장되었습니다."
          className="mb-6"
        />
      )}

      {renderContent()}
    </div>
  );
}

export default SettingsPage;