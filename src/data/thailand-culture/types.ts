export interface Province {
  code: string;
  name: string;
  region: 'central' | 'east' | 'north' | 'northeast' | 'south' | 'west';
}

export interface Place {
  id: string;
  provinceCode: string;
  name: string;
  district: string;
  category: 'temple' | 'heritage' | 'nature' | 'museum' | 'craft' | 'landmark';
  lat: number;
  lng: number;
  description: string;
  highlight: string;
}

export interface Festival {
  id: string;
  provinceCode: string;
  name: string;
  description: string;
  startMonth?: number;
  endMonth?: number;
}

export interface Culture {
  id: string;
  provinceCode: string;
  name: string;
  type: 'dance' | 'music' | 'craft' | 'belief' | 'lifestyle';
  description: string;
}

export interface Food {
  id: string;
  provinceCode: string;
  name: string;
  description: string;
}
