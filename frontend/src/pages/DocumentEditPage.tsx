import { useParams } from 'react-router-dom';
import { DocumentForm } from '../components/DocumentForm';

export function DocumentEditPage() {
  const { id } = useParams<{ id: string }>();
  return <DocumentForm documentId={id} />;
}
