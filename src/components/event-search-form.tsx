'use client';

import { useState } from 'react';
import { Search, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

type EventSearchFormProps = {
  onSearch: (filters: { searchTerm: string; date: Date | undefined; location: string }) => void;
};

export function EventSearchForm({ onSearch }: EventSearchFormProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [location, setLocation] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ searchTerm, date, location });
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    // Optional: trigger search immediately on date change
    onSearch({ searchTerm, date: selectedDate, location });
  }

  const clearFilters = () => {
    setSearchTerm('');
    setDate(undefined);
    setLocation('');
    onSearch({ searchTerm: '', date: undefined, location: '' });
  }

  return (
    <Card className="mb-12 shadow-lg">
      <CardContent className="p-6">
        <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {/* Search Input */}
          <div className="md:col-span-2 lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un événement..."
                className="h-12 pl-12 text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Date Picker */}
          <div className="md:col-span-1 lg:col-span-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'h-12 w-full justify-start text-left font-normal text-base',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {date ? format(date, 'dd MMM yyyy', { locale: fr }) : <span>Choisir une date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  initialFocus
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Location Input */}
          <div className="md:col-span-1 lg:col-span-1">
             <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Lieu (ex: Abidjan)"
                className="h-12 pl-12 text-base"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="md:col-span-4 lg:col-span-1 flex items-center gap-2">
            <Button type="submit" size="lg" className="h-12 w-full text-base">
              Rechercher
            </Button>
            <Button type="button" size="lg" variant="ghost" onClick={clearFilters} className="h-12">
                Effacer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
