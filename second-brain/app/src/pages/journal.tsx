import { observer } from 'mobx-react-lite';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, ScrollShadow } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'usehooks-ts';
import dayjs from 'dayjs';
import { JournalCalendar } from '@/components/Journal/JournalCalendar';
import { QuickCapture } from '@/components/Journal/QuickCapture';
import { api } from '@/lib/trpc';
import { MarkdownRender } from '@/components/Common/MarkdownRender';
import { Icon } from '@/components/Common/Iconify/icons';

const JournalPage = observer(() => {
  const { t } = useTranslation();
  const isPc = useMediaQuery('(min-width: 768px)');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [entry, setEntry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadEntry = useCallback(async (date: string) => {
    setIsLoading(true);
    try {
      const result = await api.notes.getJournalEntry.mutate({ date });
      setEntry(result);
    } catch (e) {
      console.error('Failed to load journal entry:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntry(selectedDate);
  }, [selectedDate, loadEntry]);

  const handleCapture = () => {
    // Reload entry after quick capture
    loadEntry(selectedDate);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');

  return (
    <div className="flex flex-col h-full p-4 md:p-6 gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Icon icon="hugeicons:calendar-01" width="24" height="24" className="text-primary" />
        <h1 className="text-xl font-semibold">{t('journal')}</h1>
        {isToday && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {t('today')}
          </span>
        )}
      </div>

      <div className={`flex ${isPc ? 'flex-row' : 'flex-col'} gap-4 flex-1 min-h-0`}>
        {/* Left: Calendar */}
        <div className={`${isPc ? 'w-[300px] shrink-0' : 'w-full'}`}>
          <Card className="bg-background border border-divider">
            <CardBody className="flex flex-col items-center gap-4 p-4">
              <JournalCalendar
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
              />

              {/* Quick Capture */}
              <div className="w-full border-t border-divider pt-3">
                <div className="flex items-center gap-1 mb-2">
                  <Icon icon="mdi:lightning-bolt" width="14" height="14" className="text-warning" />
                  <span className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                    {t('quick-capture')}
                  </span>
                </div>
                <QuickCapture date={selectedDate} onCapture={handleCapture} />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right: Journal Entry */}
        <div className="flex-1 min-h-0">
          <Card className="h-full bg-background border border-divider">
            <CardBody className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Icon icon="mdi:loading" width="24" height="24" className="animate-spin text-foreground/30" />
                </div>
              ) : entry ? (
                <ScrollShadow className="h-full p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-4 text-foreground/40 text-xs">
                    <Icon icon="mdi:calendar-outline" width="14" height="14" />
                    <span>{dayjs(selectedDate).format('dddd, MMMM D, YYYY')}</span>
                    {entry.updatedAt && (
                      <>
                        <span className="mx-1">·</span>
                        <span>{t('last-updated')}: {dayjs(entry.updatedAt).format('HH:mm')}</span>
                      </>
                    )}
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <MarkdownRender content={entry.content} />
                  </div>
                </ScrollShadow>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-foreground/30 gap-2">
                  <Icon icon="mdi:notebook-outline" width="48" height="48" />
                  <span className="text-sm">{t('no-journal-entry')}</span>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
});

export default JournalPage;
