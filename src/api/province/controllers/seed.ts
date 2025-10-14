/**
 * Seed controller for provinces
 */

const API_BASE_URL = 'https://provinces.open-api.vn/api';
const API_BASE_URL_V1 = 'https://provinces.open-api.vn/api/v1';

interface Province {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  phone_code: number;
  display_name?: string;
  districts?: District[];
}

interface District {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  short_codename: string;
  display_name?: string;
  province_code: number;
  wards?: Ward[];
}

interface Ward {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  short_codename: string;
  display_name?: string;
  district_code: number;
}

async function fetchAllProvinces(): Promise<Province[]> {
  const response = await fetch(`${API_BASE_URL}/p/`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json() as Province[];
}

async function fetchAllDistricts(): Promise<District[]> {
  const response = await fetch(`${API_BASE_URL_V1}/d/`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json() as District[];
}

async function fetchAllWards(): Promise<Ward[]> {
  const response = await fetch(`${API_BASE_URL_V1}/w/`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json() as Ward[];
}

/**
 * Upsert helper: Create or update entity based on unique filter
 */
async function upsert(
  uid: string,
  filters: any,
  data: any
): Promise<{ id: any; created: boolean }> {
  const existing = await strapi.entityService.findMany(uid as any, {
    filters,
    limit: 1,
  }) as any[];

  if (existing.length === 0) {
    const created = await strapi.entityService.create(uid as any, { data });
    return { id: created.id, created: true };
  } else {
    await strapi.entityService.update(uid as any, existing[0].id, { data });
    return { id: existing[0].id, created: false };
  }
}

export default {
  async seed(ctx) {
    const startTime = Date.now();
    const logs: string[] = [];
    
    try {
      logs.push('🌱 Starting to seed provinces, districts, and wards data...');

      // Fetch all data in parallel (much faster!)
      logs.push('🔄 Fetching data from API...');
      const [provinces, allDistricts, allWards] = await Promise.all([
        fetchAllProvinces(),
        fetchAllDistricts(),
        fetchAllWards(),
      ]);
      
      logs.push(`✅ Found ${provinces.length} provinces`);
      logs.push(`✅ Found ${allDistricts.length} districts`);
      logs.push(`✅ Found ${allWards.length} wards`);

      // Group districts by province_code for faster lookup
      const districtsByProvince = new Map<number, District[]>();
      allDistricts.forEach(district => {
        if (!districtsByProvince.has(district.province_code)) {
          districtsByProvince.set(district.province_code, []);
        }
        districtsByProvince.get(district.province_code)!.push(district);
      });

      // Group wards by district_code for faster lookup
      const wardsByDistrict = new Map<number, Ward[]>();
      allWards.forEach(ward => {
        if (!wardsByDistrict.has(ward.district_code)) {
          wardsByDistrict.set(ward.district_code, []);
        }
        wardsByDistrict.get(ward.district_code)!.push(ward);
      });

      // Create mapping from district_code to province for ward display_name
      const districtToProvince = new Map<number, Province>();
      allDistricts.forEach(district => {
        const province = provinces.find(p => p.code === district.province_code);
        if (province) {
          districtToProvince.set(district.code, province);
        }
      });

      let totalDistricts = 0;
      let totalWards = 0;

      // Process each province
      for (let i = 0; i < provinces.length; i++) {
        const province = provinces[i];
        logs.push(`📍 [${i + 1}/${provinces.length}] Processing: ${province.name}`);

        // Upsert province
        const { id: provinceId, created: provinceCreated } = await upsert(
          'api::province.province',
          { code: province.code },
          {
            name: province.name,
            code: province.code,
            codename: province.codename,
            division_type: province.division_type,
            phone_code: province.phone_code,
            display_name: province.name,
          }
        );
        
        logs.push(`   ${provinceCreated ? '✅ Created' : '⚠️  Updated'} province: ${province.name}`);

        // Process districts for this province
        const provinceDistricts = districtsByProvince.get(province.code) || [];
        if (provinceDistricts.length > 0) {
          logs.push(`   📁 Processing ${provinceDistricts.length} districts...`);
          totalDistricts += provinceDistricts.length;

          for (const district of provinceDistricts) {
            // Upsert district
            const districtDisplayName = `${district.name} (${province.name})`;
            
            const { id: districtId } = await upsert(
              'api::district.district',
              { code: district.code },
              {
                name: district.name,
                code: district.code,
                codename: district.codename,
                division_type: district.division_type,
                short_codename: district.short_codename,
                display_name: districtDisplayName,
                province: provinceId,
              }
            );

            // Process wards for this district
            const districtWards = wardsByDistrict.get(district.code) || [];
            if (districtWards.length > 0) {
              totalWards += districtWards.length;

              let wardsCreated = 0;
              let wardsUpdated = 0;

              for (const ward of districtWards) {
                // Generate display_name: "Ward Name (Province Name)"
                const wardProvince = districtToProvince.get(ward.district_code);
                const wardDisplayName = wardProvince 
                  ? `${ward.name} (${wardProvince.name})`
                  : ward.name;

                const { created } = await upsert(
                  'api::ward.ward',
                  { code: ward.code },
                  {
                    name: ward.name,
                    code: ward.code,
                    codename: ward.codename,
                    division_type: ward.division_type,
                    short_codename: ward.short_codename,
                    display_name: wardDisplayName,
                    district: districtId,
                  }
                );

                if (created) {
                  wardsCreated++;
                } else {
                  wardsUpdated++;
                }
              }

              logs.push(`      📄 ${district.name}: ${wardsCreated} created, ${wardsUpdated} updated (${districtWards.length} wards)`);
            }
          }
        }

        logs.push(`   ✅ Completed: ${province.name}`);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      ctx.send({
        success: true,
        message: 'Seed completed successfully!',
        statistics: {
          provinces: provinces.length,
          districts: totalDistricts,
          wards: totalWards,
          duration: `${duration}s`
        },
        logs
      });

    } catch (error) {
      logs.push(`❌ Error: ${error.message}`);
      ctx.send({
        success: false,
        error: error.message,
        logs
      }, 500);
    }
  }
};

