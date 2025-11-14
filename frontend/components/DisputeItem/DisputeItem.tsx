import React from 'react';
import {
  Card,
  Tag,
  Row,
  Col,
  Button,
  Popconfirm,
  Select,
  Tooltip,
  Spin,
  message,
} from 'antd';
import {
  CheckOutlined,
  LoadingOutlined,
  HeatMapOutlined,
  HourglassOutlined,
  MinusOutlined,
  GoldenFilled,
} from '@ant-design/icons';
import useSWR from 'swr';

import { useSWRConfig } from 'swr';
import axios from 'axios';

import { useStore } from '../../store/zustandStore';

import { Dispute, GET_DISPUTES_URL } from '../../types/Dispute';
import { IndexerTable } from './IndexerTable';
import { EventsContainer } from '../DisputeEvents/DisputeEvents';
import './styles.less';

interface DisputeItemProps {
  dispute: Dispute;
  onDisputeRemoval: (todo: Dispute) => void;
}

const DisputeStageMapping: Record<number, string> = {
  1: 'waiting_for_poi',
  2: 'acquired_poi',
  3: 'generated_divergent_blocks',
  4: 'arbitrating',
  5: 'dispute_settled',
};

const UPDATE_DISPUTE_ENDPOINT = 'http://localhost:8000/disputes/';
const DIVERGENT_BLOCK_ENDPOINT = 'http://localhost:8000/divergent_blocks/';

const updateDisputeStatus = async (disputeID: string, disputeStage: string) => {
  const { data } = await axios.patch(UPDATE_DISPUTE_ENDPOINT + disputeID, {
    dispute_stage: disputeStage,
  });
  return data;
};

const handleMenuClick = (newDisputeStage, disputeID, mutate, progress) => {
  const disputeString = DisputeStageMapping[newDisputeStage];
  progress(disputeID, newDisputeStage);

  updateDisputeStatus(disputeID, disputeString);
};

const { Option } = Select;

const calculateBlocks = async (dispute_id: string, payload?: string) => {
  const options = {
    method: 'POST',
    ...(payload && { body: payload }),
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };

  return fetch(DIVERGENT_BLOCK_ENDPOINT + dispute_id, options).then(r => r);
};

const DisputeItemHeader: React.FC<DisputeItemProps> = ({
  dispute,
  onDisputeRemoval,
}) => {
  const [calculatingBlocks, setCalculatingBlocks] = React.useState(false);
  const [divergentBlockResponse, setDivergentBlockResponse] =
    React.useState<Record<string, unknown>>(null);

  const { mutate } = useSWRConfig();

  const calculateDivergentBlocks = React.useCallback(dispute_id => {
    setCalculatingBlocks(true);
    return calculateBlocks(dispute_id).then(async result => {
      console.log('RESULT', result);
      setCalculatingBlocks(false);
      if (result.ok) {
        const json = await result.json();
        console.log('DIVERGENTDATA', json);
        setDivergentBlockResponse(json);
        progressDisputeState(dispute_id, 3);
      } else {
        message.error(result.json());
      }
    });
  }, []);

  const { progressDisputeState } = useStore();

  const backgroundColor = dispute_stage_color(dispute.dispute_stage);

  return (
    <div>
      <Row align="middle" style={{ justifyContent: 'space-between' }}>
        <Col>
          <Tag color={backgroundColor}>{dispute.dispute_id}</Tag>
        </Col>
        <Col>
          <Select
            style={{ width: 200 }}
            value={dispute.dispute_stage}
            onChange={e =>
              handleMenuClick(
                e,
                dispute.dispute_id,
                mutate,
                progressDisputeState,
              )
            }
          >
            <Option value={1}>
              <LoadingOutlined style={{ marginRight: 10 }} />
              Waiting for POI
            </Option>
            <Option value={2}>
              <CheckOutlined style={{ marginRight: 10 }} />
              Acquired POI
            </Option>
            <Option value={3}>
              <HeatMapOutlined style={{ marginRight: 10 }} />
              Generated Blocks
            </Option>
            <Option value={4}>
              <HourglassOutlined style={{ marginRight: 10 }} />
              Arbitrating
            </Option>
            <Option value={5}>
              <MinusOutlined style={{ marginRight: 10 }} />
              Dispute Settled
            </Option>
          </Select>

          <Tooltip title={'Calculate divergent blocks'}>
            <Button
              className="calculate-blocks"
              type="ghost"
              disabled={dispute.dispute_stage === 1}
              onClick={calculateDivergentBlocks.bind(null, dispute.dispute_id)}
            >
              {calculatingBlocks ? <Spin /> : <GoldenFilled />}
            </Button>
          </Tooltip>

          <Popconfirm
            title="Are you sure you want to delete?"
            onConfirm={() => {
              onDisputeRemoval(dispute);
            }}
          >
            <Button className="remove-todo-button" type="primary" danger>
              X
            </Button>
          </Popconfirm>
        </Col>
      </Row>
      {divergentBlockResponse !== null ? (
        <EventsContainer responseJson={divergentBlockResponse} />
      ) : null}
    </div>
  );
};

const fetcher = url => fetch(url).then(res => res.json());

const DisputeCard: React.FC<DisputeItemProps> = ({
  dispute,
  onDisputeRemoval,
}) => {
  return (
    <Card
      type="inner"
      title={
        <DisputeItemHeader
          dispute={{
            ...dispute,
          }}
          onDisputeRemoval={onDisputeRemoval}
        />
      }
    >
      <IndexerTable disputeData={dispute} />
    </Card>
  );
};

export const DisputeItem: React.FC<DisputeItemProps> = ({
  dispute,
  onDisputeRemoval,
}) => {
  return <DisputeCard dispute={dispute} onDisputeRemoval={onDisputeRemoval} />;
};

// make switch on enum type
const dispute_stage_color = (dispute_stage: number): string => {
  if (dispute_stage === 1) {
    return 'magenta';
  }
  if (dispute_stage === 2) {
    return 'volcano';
  }
  if (dispute_stage === 3) {
    return 'gold';
  }
  if (dispute_stage === 4) {
    return 'blue';
  }
  if (dispute_stage === 5) {
    return 'purple';
  }
};
