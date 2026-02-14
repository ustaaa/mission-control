import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Input, Button } from '@heroui/react';
import { Icon } from '@/components/Common/Iconify/icons';
import { api } from '@/lib/trpc';
import { useTranslation } from 'react-i18next';

interface QuickCaptureProps {
  date?: string; // YYYY-MM-DD
  onCapture?: () => void;
}

export const QuickCapture = observer(({ date, onCapture }: QuickCaptureProps) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCapture = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    try {
      await api.notes.quickCapture.mutate({ text: text.trim(), date });
      setText('');
      onCapture?.();
    } catch (e) {
      console.error('Quick capture failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 relative">
        <Input
          value={text}
          onValueChange={setText}
          placeholder={t('quick-capture-placeholder')}
          size="sm"
          startContent={
            <Icon icon="mdi:lightning-bolt" width="16" height="16" className="text-warning" />
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleCapture();
            }
          }}
          classNames={{
            inputWrapper: 'bg-default-100 hover:bg-default-200',
          }}
        />
      </div>
      <Button
        size="sm"
        color="primary"
        isLoading={isLoading}
        isDisabled={!text.trim()}
        onPress={handleCapture}
        isIconOnly
      >
        <Icon icon="mdi:send" width="16" height="16" />
      </Button>
    </div>
  );
});
