import { useLayoutEffect } from 'react';
import create from 'zustand';
import createContext from 'zustand/context';
import { v4 as uuidv4 } from 'uuid';

import { Dispute } from '../types/Dispute';
let store;

const initialState = {
  disputes: [],
};

interface DisputeState {
  disputes: Dispute[];
  addDispute: (id: string) => void;
  removeDispute: (id: string) => void;
  progressDisputeState: (id: string, stage: number) => void;
  loadData: (disputes: Dispute[]) => void;
}

const zustandContext = createContext<DisputeState>();
export const Provider = zustandContext.Provider;

// An example of how to get types
/** @type {import('zustand/index').UseStore<typeof initialState>} */
export const useStore = zustandContext.useStore;

const update_disputes = (state, disputes) => {
  const old_disputes = state.disputes;
  const old_dispute_ids = old_disputes.map(dispute => dispute.dispute_id);
  const old_disputes_updated = old_disputes.map(dispute1 => {
    const dispute2 = disputes.find(
      dispute2 => dispute2.dispute_id === dispute1.dispute_id,
    );
    return dispute2 ? { ...dispute1, ...dispute2 } : dispute1;
  });
  const new_disputes = disputes.filter(
    dispute => !old_dispute_ids.includes(dispute.dispute_id),
  );
  return [...old_disputes_updated, ...new_disputes];
};

export const initializeStore = (preloadedState = {}) => {
  return create<DisputeState>(set => ({
    ...initialState,
    ...preloadedState,
    // methods for manipulating state
    addDispute: (id: string) => {
      console.log('ADDING DISPUTE');
      set(state => ({
        disputes: [
          {
            id: uuidv4(),
            dispute_id: id,
            indexers: [],
            dispute_kind: '',
            dispute_stage: 1,
            subgraph_id: '',
          } as Dispute,
          ...state.disputes,
        ],
      }));
    },
    removeDispute: id => {
      console.log('REMOVING DISPUTE');
      set(state => ({
        disputes: state.disputes.filter(dispute => dispute.dispute_id !== id),
      }));
    },
    progressDisputeState: (id, stage) => {
      set(state => ({
        disputes: state.disputes.map(dispute =>
          dispute.dispute_id === id
            ? ({ ...dispute, dispute_stage: stage } as Dispute)
            : dispute,
        ),
      }));
    },
    loadData: disputes => {
      set(state => ({
        disputes: update_disputes(state, disputes),
      }));
    },
  }));
};

export function useCreateStore(initialState) {
  // For SSR & SSG, always use a new store.
  if (typeof window === 'undefined') {
    return () => initializeStore(initialState);
  }

  // For CSR, always re-use same store.
  store = store ?? initializeStore(initialState);
  // And if initialState changes, then merge states in the next render cycle.
  //
  // eslint complaining "React Hooks must be called in the exact same order in every component render"
  // is ignorable as this code runs in same order in a given environment
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useLayoutEffect(() => {
    if (initialState && store) {
      store.setState({
        ...store.getState(),
        ...initialState,
      });
    }
  }, [initialState]);

  return () => store;
}
