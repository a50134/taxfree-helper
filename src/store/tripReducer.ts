import type { Receipt, Trip } from '../domain/types';

export type TripAction =
  | { type: 'addReceipt'; receipt: Receipt }
  | { type: 'updateReceipt'; receipt: Receipt }
  | { type: 'deleteReceipt'; id: string }
  | { type: 'setDeparture'; date: string | undefined }
  | { type: 'toggleChecklist'; id: string }
  | { type: 'resetChecklist' };

export const emptyTrip: Trip = { receipts: [], checklistDone: [] };

/** 所有資料變動都經過這裡，方便測試 */
export function tripReducer(state: Trip, action: TripAction): Trip {
  switch (action.type) {
    case 'addReceipt':
      return { ...state, receipts: [...state.receipts, action.receipt] };
    case 'updateReceipt':
      return {
        ...state,
        receipts: state.receipts.map((r) => (r.id === action.receipt.id ? action.receipt : r)),
      };
    case 'deleteReceipt':
      return { ...state, receipts: state.receipts.filter((r) => r.id !== action.id) };
    case 'setDeparture':
      return { ...state, departureDate: action.date || undefined };
    case 'toggleChecklist': {
      const done = state.checklistDone.includes(action.id)
        ? state.checklistDone.filter((id) => id !== action.id)
        : [...state.checklistDone, action.id];
      return { ...state, checklistDone: done };
    }
    case 'resetChecklist':
      return { ...state, checklistDone: [] };
  }
}
