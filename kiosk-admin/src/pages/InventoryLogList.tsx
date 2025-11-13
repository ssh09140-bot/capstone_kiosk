import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, Flex, message, Tag } from 'antd';
import { getInventoryLogs, InventoryLog } from '../api';
import dayjs from 'dayjs';

const { Title } = Typography;

interface InventoryLogItem extends InventoryLog {
    key: string;
}

const InventoryLogList: React.FC = () => {
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
            render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
            sorter: (a: InventoryLogItem, b: InventoryLogItem) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
            defaultSortOrder: 'descend' as const,
        },
        { 
            title: '품목명', 
            dataIndex: ['inventory', 'name'], 
            key: 'inventoryName',
        },
        { 
            title: '변경량', 
            dataIndex: 'change', 
            key: 'change',
            render: (change: number) => (
                <Tag color={change > 0 ? 'green' : 'red'}>
                    {change > 0 ? `+${change}` : change}
                </Tag>
            )
        },
        { 
            title: '사유', 
            dataIndex: 'reason', 
            key: 'reason',
        },
    ];

    return (
        <>
            <Flex justify="space-between" align="center" wrap="wrap" style={{ marginBottom: '24px' }}>
                <Title level={3} style={{ margin: 0 }}>재고 변동 내역</Title>
            </Flex>
            <Table columns={columns} dataSource={logs} loading={loading} scroll={{ x: 'max-content' }} />
        </>
    );
};

export default InventoryLogList;
