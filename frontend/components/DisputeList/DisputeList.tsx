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

// export const DisputeList: React.FC<DisputeListProps> = ({
//   disputes,
//   onDisputeRemoval,
// }) => {
//   const numEachPage = 4;

//   const [minVal, setMinVal] = React.useState(0);
//   const [maxVal, setMaxVal] = React.useState(1);

//   const handleChange = value => {
//     setMinVal((value - 1) * numEachPage);
//     setMaxVal(value * numEachPage);
//   };

//   return (
//     <div>
//       {disputes &&
//         disputes.length > 0 &&
//         disputes.slice(minVal, maxVal).map(dispute => (
//           <Card>
//             <DisputeItem
//               dispute={dispute}
//               onDisputeRemoval={onDisputeRemoval}
//             />
//           </Card>
//         ))}
//       <Pagination
//         defaultCurrent={2}
//         defaultPageSize={numEachPage} //default size of page
//         onChange={handleChange}
//         total={3} //total number of card data available
//       />
//     </div>
//   );
// };
