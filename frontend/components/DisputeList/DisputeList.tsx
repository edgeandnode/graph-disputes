import React from 'react';

import { Card, Pagination, List } from 'antd';

import { Dispute } from '../../types/Dispute';
import { DisputeItem } from '../DisputeItem/DisputeItem';

interface DisputeListProps {
  disputes: Dispute[];
  onDisputeRemoval: (dispute: Dispute) => void;
}

export const DisputeList: React.FC<DisputeListProps> = ({
  disputes,
  onDisputeRemoval,
}) => {
  return (
    <List
      locale={{
        emptyText: 'No disputes',
      }}
      pagination={{
        onChange: page => {
          console.log(page);
        },
        pageSize: 3,
      }}
      dataSource={disputes}
      renderItem={dispute => (
        <DisputeItem dispute={dispute} onDisputeRemoval={onDisputeRemoval} />
      )}
    />
  );
};
