import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, Flex, message, Tag } from 'antd';
import { getInventoryLogs, type InventoryLog } from '../api';
import { useIsMobile } from '../hooks/useIsMobile';
import dayjs from 'dayjs';

const { Title } = Typography;

interface InventoryLogItem extends InventoryLog {
    key: string;
}

const InventoryLogList: React.FC = () => {
    const isMobile = useIsMobile();
    const [logs, setLogs] = useState<InventoryLogItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getInventoryLogs();
            const dataWithKeys = response.map((item: InventoryLog) => ({ ...item, key: item.id.toString() }));
            setLogs(dataWithKeys);
        } catch (error) {
            console.error("재고 로그 로딩 실패:", error);
            message.error('재고 로그를 불러오는 데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const columns = [
        { 
            title: '일시', 
            dataIndex: 'createdAt', 
            key: 'createdAt',
            width: isMobile ? 140 : 180,
            fixed: isMobile ? 'left' : undefined,
            render: (text: string) => {
                const date = dayjs(text);
                if (isMobile) {
                    return date.format('MM/DD HH:mm');
                }
                return date.format('YYYY-MM-DD HH:mm:ss');
            },
            sorter: (a: InventoryLogItem, b: InventoryLogItem) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
            defaultSortOrder: 'descend' as const,
        },
        { 
            title: '품목명', 
            dataIndex: ['inventory', 'name'], 
            key: 'inventoryName',
            width: isMobile ? 120 : 150,
            ellipsis: true,
        },
        { 
            title: '변경량', 
            dataIndex: 'change', 
            key: 'change',
            width: isMobile ? 80 : 100,
            render: (change: number) => (
                <Tag color={change > 0 ? 'green' : 'red'} style={{ fontSize: isMobile ? '11px' : '12px' }}>
                    {change > 0 ? `+${change}` : change}
                </Tag>
            )
        },
        { 
            title: '사유', 
            dataIndex: 'reason', 
            key: 'reason',
            width: isMobile ? 120 : 200,
            ellipsis: true,
        },
    ];

    return (
        <>
            <Flex 
                justify="space-between" 
                align="center" 
                wrap="wrap" 
                style={{ marginBottom: isMobile ? '16px' : '24px' }}
            >
                <Title 
                    level={isMobile ? 4 : 3} 
                    style={{ 
                        margin: 0,
                        fontSize: isMobile ? '20px' : '24px',
                        fontWeight: 700
                    }}
                >
                    재고 변동 내역
                </Title>
            </Flex>
            <Table 
                columns={columns} 
                dataSource={logs} 
                loading={loading} 
                scroll={{ x: 'max-content' }}
                size={isMobile ? 'small' : 'middle'}
                pagination={isMobile ? { pageSize: 10, showSizeChanger: false } : { pageSize: 20 }}
            />
        </>
    );
};

export default InventoryLogList;
