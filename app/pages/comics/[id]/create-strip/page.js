import CreateStrip from './CreateStrip';

export default function CreateStripPage({ params }) {
  return (
    <div>
      <h1>Create Strip</h1>
      <CreateStrip comicId={params.id} />
    </div>
  );
} 