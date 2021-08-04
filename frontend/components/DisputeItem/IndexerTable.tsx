import { List, Table, Button, Statistic, Tag } from 'antd';
import {
  BlockOutlined,
  DatabaseOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Dispute } from '../../types/Dispute';

interface IndexerUploads {
  indexerUploads: IndexerUploadProps[];
}
interface IndexerUploadProps {
  path: string;
  kind: string;
}

interface IndexerRowItem {
  key: number;
  indexer_id: string;
  name: string;
  divergentBlocks?: number;
  indexerUploads?: JSX.Element;
  uploaded: string;
}

const columns = [
  {
    title: 'Indexer ID',
    dataIndex: 'indexer_id',
    key: 'indexer_id',
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.indexer_id.localeCompare(b.indexer_id),
  },

  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
  {
    title: 'Pull Data',
    dataIndex: '',
    key: 'x',
    render: () => <Button>Pull</Button>,
  },
  {
    title: 'Uploaded ?',
    dataIndex: 'uploaded',
    key: 'uploaded',
    filters: [
      {
        text: 'True',
        value: 'True',
      },
      {
        text: 'False',
        value: 'False',
      },
    ],
    onFilter: (value, record) => record.uploaded.indexOf(value) === 0,
  },
];

// Identified the blocks of concern
// Can be at indexer pair level, and the entire dispute
interface DivergentBlockProp {
  divergentBlock: number;
}

const DivergentBlock: React.FC<DivergentBlockProp> = ({ divergentBlock }) => {
  return <Statistic title="Divergent Block" value={divergentBlock} />;
};

const getTagForKind = (kind: string) => {
  switch (kind) {
    case 'poi':
      return (
        <Tag icon={<BlockOutlined />} color="success">
          POI
        </Tag>
      );
    case 'entities':
      return (
        <Tag icon={<DatabaseOutlined />} color="processing">
          Entities
        </Tag>
      );
    case 'metadata':
      return (
        <Tag icon={<FileTextOutlined />} color="default">
          Metadata
        </Tag>
      );
  }
};

const IndexerUploads: React.FC<IndexerUploads> = ({ indexerUploads }) => {
  return (
    <List
      itemLayout="horizontal"
      dataSource={indexerUploads}
      renderItem={item => (
        <List.Item>
          <List.Item.Meta
            avatar={getTagForKind(item.kind)}
            description={item.path}
          />
        </List.Item>
      )}
    />
  );
};

const mapDisputeDataToObjectArray = (data: Dispute): any[] => {
  const indexerRowItems = [] as IndexerRowItem[];

  const indexers = data.indexers ?? [];
  indexers.forEach((indexer, idx) => {
    const ri = {
      key: idx,
      indexer_id: indexer.indexer_id,
      name: indexer.name,
      indexerUploads: (
        <IndexerUploads indexerUploads={indexer.indexer_uploads} />
      ),
      uploaded: (indexer.indexer_uploads ?? []).length > 0 ? 'True' : 'False',
    };
    indexerRowItems.push(ri);
  });

  return indexerRowItems;
};

interface IndexerTableProps {
  disputeData: Dispute;
}

export const IndexerTable: React.FC<IndexerTableProps> = ({ disputeData }) => {
  const mappedData = mapDisputeDataToObjectArray(disputeData);

  return (
    <Table
      columns={columns}
      expandable={{
        expandedRowRender: record => (
          <div style={{ margin: 0 }}>{record.indexerUploads ?? []}</div>
        ),
        rowExpandable: record => record.indexerUploads !== null,
      }}
      dataSource={mappedData}
      pagination={{ pageSize: 5 }}
    />
  );
};
