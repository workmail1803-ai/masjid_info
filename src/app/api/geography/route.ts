import { NextResponse } from 'next/server';
import { getDivisions, getDistricts, getDistrictsByDivision, getUpazilasByDistrict } from '@/lib/services/geography.service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const divisionId = searchParams.get('division_id');
  const districtId = searchParams.get('district_id');

  if (districtId) {
    const upazilas = await getUpazilasByDistrict(Number(districtId));
    return NextResponse.json({ upazilas }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  }

  if (divisionId) {
    const districts = await getDistrictsByDivision(Number(divisionId));
    return NextResponse.json({ districts }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  }

  const [divisions, districts] = await Promise.all([getDivisions(), getDistricts()]);
  return NextResponse.json({ divisions, districts }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
