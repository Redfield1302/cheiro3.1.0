export default function PageState({ loading, error }) {
  if (loading) return <div className="state">Carregando...</div>;
  if (error) return <div className="state error">{error}</div>;
  return null;
}
