import React from 'react';
import { Row, Col, Card, PageHeader, Spin } from 'antd';

import { Dispute } from '../types/Dispute';
import { DisputeList } from '../components/DisputeList/DisputeList';
import { AddDisputeForm } from '../components/AddDisputeForm/AddDisputeForm';

import { message } from 'antd';

import useSWR from 'swr';

import { initializeStore, useStore } from '../store/zustandStore';
import { GET_DISPUTES_URL } from '../types/Dispute';

async function getDisputes(url) {
  const response = await fetch(url);
  console.log(response);
  const jsonData = await response.json();
  return jsonData;
}

interface DisputeContainerProps {
  disputes: Dispute[];
}

const DisputesContainer: React.FC<DisputeContainerProps> = () => {
  const { data: disputeData, error: disputeError } = useSWR(
    GET_DISPUTES_URL,
    getDisputes,
  );

  const {
    addDispute,
    removeDispute,
    progressDisputeState,
    loadData,
    disputes,
  } = useStore();

  React.useEffect(() => {
    if (disputeData) {
      const parsedDisputes = parseJsonToDispute(disputeData);
      loadData(parsedDisputes);
    }
  }, [disputeData]);

  const handleFormSubmit = (dispute: Dispute): void => {
    addDispute(dispute.dispute_id);
    message.success('Dispute added!');
  };

  const handleRemoveDispute = (dispute: Dispute): void => {
    removeDispute(dispute.dispute_id);
    message.warn('Dispute removed!');
  };

  const parseJsonToDispute = (disputeJson: any[]): Dispute[] => {
    const disputes = [] as Dispute[];
    const disputeArray = disputeJson['disputes'];
    disputeArray.forEach(dispute => {
      disputes.push(dispute as Dispute);
    });

    return disputes;
  };

  const disputeRender = (data, error) => {
    if (error) {
      return <div>Error fetching disputes</div>;
    }
    if (!data) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Spin />
        </div>
      );
    }
    return (
      <DisputeList disputes={disputes} onDisputeRemoval={handleRemoveDispute} />
    );
  };

  return (
    <Row
      justify="center"
      align="middle"
      gutter={[0, 10]}
      className="disputes-container"
      style={{ marginTop: '10px', marginBottom: '10px' }}
    >
      <Col
        xs={{ span: 23 }}
        sm={{ span: 23 }}
        md={{ span: 21 }}
        lg={{ span: 20 }}
        xl={{ span: 18 }}
      >
        <PageHeader
          title="Add Dispute"
          subTitle="To add a dispute, just fill the form below and click in add dispute."
        />
      </Col>

      <Col
        xs={{ span: 20 }}
        sm={{ span: 25 }}
        md={{ span: 28 }}
        lg={{ span: 30 }}
        xl={{ span: 32 }}
      >
        <Card title="Create a new dispute">
          <AddDisputeForm onFormSubmit={handleFormSubmit} />
        </Card>
      </Col>

      <Col
        xs={{ span: 20 }}
        sm={{ span: 25 }}
        md={{ span: 28 }}
        lg={{ span: 30 }}
        xl={{ span: 32 }}
      >
        <Card title="Dispute List">
          {disputeRender(disputeData, disputeError)}
        </Card>
      </Col>
    </Row>
  );
};

export default DisputesContainer;

export function getServerSideProps() {
  const zustandStore = initializeStore();

  zustandStore.getState().disputes;

  return {
    props: {
      // the "stringify and then parse again" piece is required as next.js
      // isn't able to serialize it to JSON properly
      initialZustandState: JSON.parse(JSON.stringify(zustandStore.getState())),
    },
  };
}
