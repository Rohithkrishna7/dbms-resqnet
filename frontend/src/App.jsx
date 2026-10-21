import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { DisastersPage } from './pages/Disasters';
import { EmergencyRequestsPage } from './pages/EmergencyRequests';
import { VolunteersPage } from './pages/Volunteers';
import { AssignmentsPage } from './pages/Assignments';
import { InventoryPage } from './pages/Inventory';
import { GraphExplorerPage } from './pages/GraphExplorer';
import { AdvancedQueriesPage } from './pages/AdvancedQueries';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'disasters':
        return <DisastersPage />;
      case 'requests':
        return <EmergencyRequestsPage />;
      case 'volunteers':
        return <VolunteersPage />;
      case 'assignments':
        return <AssignmentsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'graph':
        return <GraphExplorerPage />;
      case 'queries':
        return <AdvancedQueriesPage />;
      default:
        return <Dashboard onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <Layout currentTab={currentTab} setTab={setCurrentTab}>
      {renderContent()}
    </Layout>
  );
}
