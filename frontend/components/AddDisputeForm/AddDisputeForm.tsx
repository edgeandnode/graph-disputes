import React from 'react';
import { Form, Row, Col, Button, Input } from 'antd';
import { PlusCircleFilled } from '@ant-design/icons';
import axios from 'axios';

import './styles.less';
import { Dispute } from '../../types/Dispute';

interface AddDisputeFormProps {
  onFormSubmit: (dispute: Dispute) => void;
}

const addDispute = async (disputePayload: Record<string, any>) => {
  console.log('ADDDISPUTE', disputePayload);
  const { data } = await axios.post(
    'http://localhost:8000/disputes',
    disputePayload,
  );
  return data;
};

// {
//   "id": 0,
//   "dispute_id": "string",
//   "indexer_ids": [
//     "string"
//   ],
//   "dispute_kind": "dispute",
//   "supgraph_id": ""
// }

export const AddDisputeForm: React.FC<AddDisputeFormProps> = ({
  onFormSubmit,
}) => {
  const [form] = Form.useForm();

  const [indexerInput, setIndexerInput] = React.useState('');
  const [indexerIDs, setIndexerIDs] = React.useState([]);

  React.useEffect(() => {
    formatText();
    console.log(indexerIDs);
  }, [indexerInput]);

  const onFinish = () => {
    console.log(indexerInput);
    console.log(indexerIDs);
    formatText();
    const dispute_id = form.getFieldValue('dispute_id');
    const dispute_kind = 'dispute';

    onFormSubmit({
      dispute_id: dispute_id,
      indexer_ids: indexerIDs,
      dispute_stage: 1,
      subgraph_id: '',
    });

    addDispute({
      dispute_id: dispute_id,
      dispute_kind: dispute_kind,
      indexer_ids: indexerIDs,
      subgraph_id: '',
    });
    setIndexerIDs([]);
    setIndexerInput('');
    form.resetFields();
  };

  const handleTextChange = e => {
    console.log(indexerInput);
    setIndexerInput(e.target.value);
  };

  const formatText = () => {
    const split = indexerInput.split('0x');
    const replaced = i =>
      i.replaceAll(' ', '').replaceAll('\n', '').replaceAll(',', '');
    const mapped = split.map(s => replaced(s)).filter(s => s !== '');
    setIndexerIDs(mapped);
  };

  return (
    <Form
      form={form}
      onFinish={onFinish}
      layout="horizontal"
      className="dispute-form"
    >
      <Row gutter={20} justify="center">
        <Col xs={24} sm={24} md={17} lg={19} xl={20}>
          <Form.Item
            name={'dispute_id'}
            rules={[{ required: true, message: 'This field is required' }]}
          >
            <Input placeholder="What is the id of the dispute?" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={24} md={17} lg={19} xl={20}>
          <Form.Item
            name={'subgraph_id'}
            rules={[{ required: true, message: 'This field is required' }]}
          >
            <Input placeholder="What is the subgraph deployment hash?" />
          </Form.Item>
        </Col>
      </Row>
      <Row justify="space-between">
        <Col flex={2}>
          <Form.Item
            style={{ alignItems: 'center' }}
            name={'indexers'}
            label="Indexers"
          >
            <Input.TextArea
              value={indexerInput}
              onChange={e => handleTextChange(e)}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row justify="center">
        <Col xs={24} sm={24} md={7} lg={5} xl={4}>
          <Button type="primary" htmlType="submit" block>
            <PlusCircleFilled />
            Add Dispute
          </Button>
        </Col>
      </Row>
    </Form>
  );
};
