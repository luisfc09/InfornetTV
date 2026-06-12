// Modal de edição de provedor (nome de exibição, URL da API, prioridade).

import { useState, type FormEvent } from 'react';
import { X, Loader } from 'lucide-react';

export interface ProviderForm {
  id: string;
  display_name: string;
  description: string | null;
  api_base_url: string;
  priority: number;
}

interface Props {
  provider: ProviderForm;
  onSave: (p: ProviderForm) => Promise<void>;
  onClose: () => void;
}

export default function ProviderEditModal({ provider, onSave, onClose }: Props) {
  const [form, setForm] = useState<ProviderForm>({ ...provider });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const input =
    'w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-red-600';

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Editar ${provider.display_name}`}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Editar provedor</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-700 bg-red-900/50 p-3 text-xs text-red-200">
            {error}
          </div>
        )}

        <label className="mb-3 block text-xs font-medium text-gray-300">
          Nome de exibição
          <input
            className={`mt-1 ${input}`}
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            required
          />
        </label>

        <label className="mb-3 block text-xs font-medium text-gray-300">
          Descrição
          <input
            className={`mt-1 ${input}`}
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>

        <label className="mb-3 block text-xs font-medium text-gray-300">
          URL base da API
          <input
            type="url"
            className={`mt-1 ${input}`}
            value={form.api_base_url}
            onChange={(e) => setForm({ ...form, api_base_url: e.target.value })}
            required
          />
        </label>

        <label className="mb-5 block text-xs font-medium text-gray-300">
          Prioridade (1 = tenta primeiro)
          <input
            type="number"
            min={1}
            max={99}
            className={`mt-1 ${input}`}
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: Number(e.target.value) })
            }
            required
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving && <Loader className="h-3.5 w-3.5 animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
