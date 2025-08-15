import React from 'react';
import { List, Card, Button, Collapse, Descriptions, Table } from 'antd';
const { Panel } = Collapse;

const columns = [
  {
    title: 'From',
    dataIndex: 'from',
    key: 'from',
  },
  {
    title: 'To',
    dataIndex: 'to',
    key: 'to',
  },
  {
    title: 'Value',
    dataIndex: 'value',
    key: 'value',
  },
];

const parseDivergentBlock = (responseJson: Record<string, any>): number[] => {
  const divergent_blocks = responseJson.divergent_blocks;
  const blocks = divergent_blocks.divergent_blocks;
  return blocks;
};

export interface SubgraphEvent {
  event: string;
  handler: string;
}

export interface LogParams {
  from: string;
  to: string;
  value: number;
}

export interface EthereumEvent {
  address: string;
  block: number;
  event: string;
  subgraphEvents: SubgraphEvent[];
  handlers: string[];
  logParams: LogParams;
}

const deduplicateArray = (array: any[]) => {
  const res = [
    ...new Map(array.map(item => [JSON.stringify(item), item])).values(),
  ];
  return res;
};

const parseEvents = (responseJson: Record<string, any>): EthereumEvent[] => {
  const ethereumEvents: EthereumEvent[] = [];
  const matchedEvents: Record<string, unknown>[] = responseJson.matching_events;
  for (const e of matchedEvents) {
    const ethereumEvent = {
      address: e.address,
      block: e.block,
      event: e.event,
      subgraphEvents: e.subgraph_events,
      handlers: e.handlers,
      logParams: e.log_params,
    } as EthereumEvent;
    ethereumEvents.push(ethereumEvent);
  }
  return deduplicateArray(ethereumEvents);
};

interface EthereumEventListProps {
  ethereumEvents: EthereumEvent[];
}

interface LogParamProps {
  logParams: LogParams;
}

const LogParamList: React.FC<LogParamProps> = ({ logParams }) => {
  return (
    <Table columns={columns} dataSource={[logParams]} pagination={false} />
  );
};

export const EventsList: React.FC<EthereumEventListProps> = ({
  ethereumEvents,
}) => {
  return (
    <List
      style={{ marginBottom: '20px' }}
      grid={{ gutter: 10, xs: 2, md: 3 }}
      size="small"
      loadMore={<Button style={{ width: '100%' }}></Button>}
      bordered
      dataSource={ethereumEvents}
      renderItem={item => (
        <List.Item style={{ marginTop: '20px' }}>
          <Card>
            <Card.Meta description={item.event} />
            <Descriptions bordered style={{ padding: 10 }}>
              <Descriptions.Item label="Address">
                {item.address}
              </Descriptions.Item>
              <Descriptions.Item label="Block">{item.block}</Descriptions.Item>
              <Descriptions.Item label="Handlers">
                {item.handlers}
              </Descriptions.Item>
            </Descriptions>
            <LogParamList logParams={item.logParams} />
          </Card>
        </List.Item>
      )}
    />
  );
};

interface EventsContainerProps {
  responseJson: Record<string, any>;
}
export const EventsContainer: React.FC<EventsContainerProps> = ({
  responseJson,
}) => {
  console.log('RESPONSE', responseJson);
  const ethereumEvents = parseEvents(responseJson);
  return (
    <Collapse collapsible="header" defaultActiveKey={['1']}>
      <Panel header="Divergent Ethereum Events" key="1">
        <EventsList ethereumEvents={ethereumEvents} />
      </Panel>
    </Collapse>
  );
};
