import React from 'react';
import { List, Typography } from 'antd';
import type { Notification } from '../models/Notification'; // Assuming a model definition file

const { Text } = Typography;

interface NotificationPanelProps {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  loading: boolean;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onNotificationClick, loading }) => {
  if (loading) {
    return <List.Item style={{ padding: '12px 24px' }}>Loading...</List.Item>;
  }

  if (notifications.length === 0) {
    return <List.Item style={{ padding: '12px 24px' }}>새로운 알림이 없습니다.</List.Item>;
  }

  return (
    <List
      itemLayout="horizontal"
      dataSource={notifications}
      renderItem={item => (
        <List.Item 
          onClick={() => onNotificationClick(item)}
          style={{ 
            padding: '12px 24px', 
            cursor: 'pointer', 
            backgroundColor: item.read ? 'transparent' : '#e6f7ff' 
          }}
        >
          <List.Item.Meta
            title={<Text strong={!item.read}>{item.message}</Text>}
            description={new Date(item.createdAt).toLocaleString('ko-KR')}
          />
        </List.Item>
      )}
    />
  );
};

export default NotificationPanel;
