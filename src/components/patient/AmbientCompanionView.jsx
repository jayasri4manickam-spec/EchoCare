import React from 'react';
import { PatientHomeView } from './PatientHomeView';

// Re-export for legacy compatibility
export const AmbientCompanionView = (props) => {
  return <PatientHomeView {...props} />;
};

export default AmbientCompanionView;
