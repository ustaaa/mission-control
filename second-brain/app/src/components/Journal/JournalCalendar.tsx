import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { Icon } from '@/components/Common/Iconify/icons';
import dayjs from 'dayjs';
import { api } from '@/lib/trpc';

interface JournalCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

export const JournalCalendar = observer(({ selectedDate, onSelectDate }: JournalCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs(selectedDate).startOf('month'));
  const [datesWithEntries, setDatesWithEntries] = useState<string[]>([]);

  useEffect(() => {
    const yearMonth = currentMonth.format('YYYY-MM');
    api.notes.journalDates.query({ yearMonth }).then(setDatesWithEntries).catch(console.error);
  }, [currentMonth]);

  const today = dayjs().format('YYYY-MM-DD');
  const daysInMonth = currentMonth.daysInMonth();
  const firstDayOfWeek = currentMonth.day(); // 0 = Sunday
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const prevMonth = () => setCurrentMonth(currentMonth.subtract(1, 'month'));
  const nextMonth = () => setCurrentMonth(currentMonth.add(1, 'month'));
  const goToToday = () => {
    setCurrentMonth(dayjs().startOf('month'));
    onSelectDate(today);
  };

  return (
    <div className="w-full max-w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Button isIconOnly size="sm" variant="light" onPress={prevMonth}>
          <Icon icon="mdi:chevron-left" width="18" height="18" />
        </Button>
        <button
          className="text-sm font-semibold hover:text-primary transition-colors"
          onClick={goToToday}
        >
          {currentMonth.format('MMMM YYYY')}
        </button>
        <Button isIconOnly size="sm" variant="light" onPress={nextMonth}>
          <Icon icon="mdi:chevron-right" width="18" height="18" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs text-foreground/40 font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-9" />;
          }
          const dateStr = currentMonth.date(day).format('YYYY-MM-DD');
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasEntry = datesWithEntries.includes(dateStr);

          return (
            <button
              key={dateStr}
              className={`h-9 w-full flex flex-col items-center justify-center rounded-md text-sm transition-colors relative
                ${isSelected ? 'bg-primary text-primary-foreground font-medium' : ''}
                ${isToday && !isSelected ? 'text-primary font-semibold' : ''}
                ${!isSelected && !isToday ? 'hover:bg-hover text-foreground/70' : ''}
              `}
              onClick={() => onSelectDate(dateStr)}
            >
              {day}
              {hasEntry && !isSelected && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
