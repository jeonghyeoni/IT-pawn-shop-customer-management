import { useCallback, useEffect, useState } from 'react';
import type { Settings as SettingsT } from '../shared/types';
import { api } from './api';
import { useApp, useLoad } from './app-context';
import { HelpLayer } from './components/Help';
import { Header, UpdateBanner } from './components/ui';
import { ContractDetail } from './pages/ContractDetail';
import { ContractForm } from './pages/ContractForm';
import { ContractList } from './pages/ContractList';
import { CustomerDetail, Customers } from './pages/Customers';
import { SentHistory } from './pages/SentHistory';
import { Settings } from './pages/Settings';
import { Today } from './pages/Today';

function EditContract({ id, today }: { id: number; today: string }) {
  const { data } = useLoad(() => api.getContract(id), [id]);
  if (!data) return <main className="main" />;
  return <ContractForm today={today} existing={data} />;
}

export function App() {
  const { route, fail } = useApp();
  const [settings, setSettings] = useState<SettingsT | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const closeHelp = useCallback(() => setHelp(false), []);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(fail);
    api.getToday().then(setToday).catch(fail);
    // 밤을 넘겨 켜 두어도 날짜가 바뀌도록 1분마다 확인
    const t = window.setInterval(() => api.getToday().then(setToday).catch(() => undefined), 60_000);
    return () => window.clearInterval(t);
  }, [fail]);

  if (!settings || !today) return null;

  let page;
  switch (route.name) {
    case 'today': page = <Today key={today} settings={settings} />; break;
    case 'new': page = <ContractForm key={`new-${route.customerId ?? ''}`} today={today} initialCustomerId={route.customerId} />; break;
    case 'contracts': page = <ContractList />; break;
    case 'customers': page = <Customers />; break;
    case 'contract': page = <ContractDetail key={route.id} id={route.id} today={today} />; break;
    case 'editContract': page = <EditContract key={route.id} id={route.id} today={today} />; break;
    case 'customer': page = <CustomerDetail key={route.id} id={route.id} />; break;
    case 'sent': page = <SentHistory today={today} />; break;
    case 'settings': page = <Settings settings={settings} onSaved={setSettings} />; break;
  }

  return (
    <>
      <Header shopName={settings.shopName} today={today} onHelp={() => setHelp(true)} />
      <UpdateBanner />
      {page}
      {help && <HelpLayer route={route.name} onClose={closeHelp} />}
    </>
  );
}
