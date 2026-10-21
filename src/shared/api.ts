import type {
  ContractDetail, ContractFilter, ContractInput, ContractRow, ContractStatus, Customer, CustomerDetail,
  CustomerSummary, Dashboard, DueItem, ISODate, Settings, UpdateStatus
} from './types';

export interface CustomerInput {
  name: string;
  phone: string;
  memo: string;
}

export type CustomerSaveResult =
  | { ok: true; customer: Customer }
  | { ok: false; message: string; existing?: Customer };

/** 화면(renderer)에서 부를 수 있는 기능 전부. main 프로세스가 구현한다. */
export interface PawnApi {
  getToday(): Promise<ISODate>;
  getDashboard(): Promise<Dashboard>;
  listSent(): Promise<DueItem[]>;
  markSent(contractId: number, period: number, sent: boolean): Promise<void>;
  setPaid(contractId: number, period: number, paidDate: ISODate | null): Promise<void>;

  findCustomers(query: string): Promise<CustomerSummary[]>;
  getCustomer(id: number): Promise<CustomerDetail>;
  createCustomer(input: CustomerInput): Promise<CustomerSaveResult>;
  updateCustomer(id: number, input: CustomerInput): Promise<CustomerSaveResult>;

  searchContracts(filter: ContractFilter): Promise<ContractRow[]>;
  getContract(id: number): Promise<ContractDetail>;
  createContract(input: ContractInput, photos: string[], markPastDone: boolean): Promise<number>;
  updateContract(id: number, input: ContractInput): Promise<void>;
  deleteContract(id: number): Promise<void>;
  setContractStatus(id: number, status: ContractStatus): Promise<void>;

  /** 파일 고르기 창 → 임시 보관된 사진 이름들 */
  pickPhotos(): Promise<string[]>;
  /** 끌어다 놓은 파일 경로들 → 임시 보관된 사진 이름들 */
  importPhotos(paths: string[]): Promise<string[]>;
  addContractPhotos(contractId: number, names: string[]): Promise<void>;
  removeContractPhoto(contractId: number, name: string): Promise<void>;

  exportContracts(filter: ContractFilter): Promise<string | null>;
  exportAll(): Promise<string | null>;

  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  copyText(text: string): Promise<void>;
  openDataFolder(): Promise<void>;
  backupNow(): Promise<string>;
  getAppInfo(): Promise<{ version: string; dataDir: string }>;

  getUpdateStatus(): Promise<UpdateStatus>;
  downloadUpdate(): Promise<void>;
}

export type ApiMethod = keyof PawnApi;

export interface PawnBridge {
  invoke(method: ApiMethod, args: unknown[]): Promise<unknown>;
  onUpdateStatus(cb: (s: UpdateStatus) => void): () => void;
  pathForFile(file: File): string;
}
