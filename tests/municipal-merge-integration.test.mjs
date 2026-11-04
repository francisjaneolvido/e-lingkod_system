import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServerTypescript } from './helpers/load-typescript.mjs';

const enabled = /^elb_b3_test_[a-f0-9]{32}$/.test(process.env.ELB_MUNICIPAL_TEST_DATABASE || '') &&
  new URL(process.env.DATABASE_URL || 'mysql://localhost/unused').pathname === '/' + process.env.ELB_MUNICIPAL_TEST_DATABASE;
test('municipal merged API: authorization, publication, progress, directory and validation', { skip: !enabled }, async () => {
  const hook = loadServerTypescript();
  const { prisma } = await import('../src/lib/prisma.ts');
  const { auth } = await import('../src/lib/auth.ts');
  const projects = await import('../src/app/api/admin/projects/route.ts');
  const offices = await import('../src/app/api/admin/projects/offices/route.ts');
  const { LGU_OFFICES } = await import('../src/lib/lgu-offices.ts');
  const { PROJECT_CATEGORIES, PROJECT_PHASES } = await import('../src/features/projects/domain.ts');
  const origin = process.env.BETTER_AUTH_URL;
  async function account(role, department, modules = []) {
    const email = `merge.${role}@example.test`;
    const result = await auth.api.signUpEmail({ body: { email, password: 'Municipal-browser-2026!', firstName: 'Synthetic', lastName: role, hasNoMiddleName: true, phoneNumber: '+639001234567' }, returnHeaders: true });
    const user = await prisma.user.update({ where: { email }, data: { role: role === 'admin' ? 'ADMIN' : role === 'citizen' ? 'CITIZEN' : 'STAFF', department } });
    for (const staffModule of modules) await prisma.staffPermission.create({ data: { userId: user.id, module: staffModule } });
    return { user, cookie: result.headers.getSetCookie().map(x => x.split(';')[0]).join('; ') };
  }
  const request = (route, actor, body, from = origin) => new Request(origin + route, { method: 'POST', headers: { origin: from, cookie: actor?.cookie || '', 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const post = (actor, body, from) => projects.POST(request('/api/admin/projects', actor, body, from));
  const office = (actor, body) => offices.POST(request('/api/admin/projects/offices', actor, body));
  try {
    const leadOffice = LGU_OFFICES.find(x => !/MPDO|PIO/i.test(x.name)).name;
    const admin = await account('admin', null), staff = await account('staff', leadOffice, ['PROJECTS']);
    const denied = await account('denied', leadOffice), citizen = await account('citizen', null);
    const outsider = await account('outsider', 'Unrelated synthetic office', ['PROJECTS']);
    const input = { action: 'project.save', title: '[TEST] Municipal integration project', summary: 'Synthetic integration fixture. No real municipal operation.', category: PROJECT_CATEGORIES[0], phase: PROJECT_PHASES[0], leadOffice, barangays: ['Bambang'], sourceUrl: 'https://example.test/synthetic-project' };
    for (const [actor, status] of [[null,401],[citizen,403],[denied,403],[outsider,403]]) assert.equal((await post(actor, input)).status, status);
    assert.equal((await post(staff, input, 'https://untrusted.example.test')).status, 403);
    const saved = await post(staff, input); assert.equal(saved.status, 200);
    const id = (await saved.json()).id; assert.ok(id);
    assert.equal((await prisma.municipalProject.findUniqueOrThrow({where:{id}})).status, 'DRAFT');
    assert.equal(await prisma.municipalProject.count({ where: { id, status: 'PUBLISHED' } }), 0);
    assert.equal((await post(staff, { action:'project.submit', id })).status, 200);
    assert.equal((await post(staff, { action:'project.review', id, decision:'PUBLISH' })).status, 403);
    assert.equal((await post(admin, { action:'project.review', id, decision:'RETURN' })).status, 400);
    assert.equal((await post(admin, { action:'project.review', id, decision:'RETURN', reason:'Synthetic return' })).status, 200);
    assert.equal((await post(staff, {...input,id})).status, 200);
    assert.equal((await post(staff, { action:'project.submit', id })).status, 200);
    assert.equal((await post(admin, { action:'project.review', id, decision:'PUBLISH' })).status, 200);
    assert.equal((await post(admin, { action:'project.review', id, decision:'PUBLISH' })).status, 400);
    const milestone = await post(staff, { action:'update.add', projectId:id, title:'[TEST] Reviewed progress', details:'Synthetic approved milestone', progressPercent:35, phaseAfter:'ONGOING', sourceUrl:'https://example.test/synthetic-progress' });
    assert.equal(milestone.status, 200); const updateId = (await milestone.json()).id;
    assert.equal(await prisma.municipalProjectUpdate.count({where:{id:updateId,status:'APPROVED'}}),0);
    assert.equal((await post(staff,{action:'update.review',id:updateId,decision:'APPROVE'})).status,403);
    assert.equal((await post(admin,{action:'update.review',id:updateId,decision:'APPROVE'})).status,200);
    assert.equal((await prisma.municipalProject.findUniqueOrThrow({where:{id}})).phase,'ONGOING');
    assert.equal((await post(admin,{action:'update.review',id:updateId,decision:'APPROVE'})).status,400);
    const contact = { action:'office.propose', officeName:leadOffice, phone:'0491234567', email:'synthetic@example.test', officeHours:'Synthetic test hours', address:'Synthetic test location', sourceUrl:'https://example.test/synthetic-directory' };
    assert.equal((await office(citizen,contact)).status,403); assert.equal((await office(denied,contact)).status,403);
    assert.equal((await office(outsider,contact)).status,403);
    const proposed = await office(staff,contact); assert.equal(proposed.status,200); const proposalId=(await proposed.json()).id;
    assert.equal(await prisma.municipalOfficeDirectoryEntry.count({where:{officeName:leadOffice}}),0);
    assert.equal((await office(staff,{action:'office.review',id:proposalId,decision:'APPROVE'})).status,403);
    assert.equal((await office(admin,{action:'office.review',id:proposalId,decision:'APPROVE'})).status,200);
    assert.equal((await prisma.municipalOfficeDirectoryEntry.findUniqueOrThrow({where:{officeName:leadOffice}})).isPublished,true);
    assert.equal((await office(admin,{action:'office.review',id:proposalId,decision:'APPROVE'})).status,400);
    assert.equal((await office(admin,{action:'office.unpublish',officeName:leadOffice})).status,200);
    assert.equal((await prisma.municipalOfficeDirectoryEntry.findUniqueOrThrow({where:{officeName:leadOffice}})).isPublished,false);
    // Keep a pending proposal and milestone for public/browser privacy checks.
    assert.equal((await office(staff,{...contact,notes:'PRIVATE PENDING DIRECTORY TEXT'})).status,200);
    assert.equal((await post(staff,{action:'update.add',projectId:id,title:'PRIVATE PENDING PROGRESS',details:'Not approved',sourceUrl:'https://example.test/pending'})).status,200);
    assert.equal((await post(staff,{...input,title:'PRIVATE DRAFT PROJECT'})).status,200);
    assert.equal((await post(staff,{...input,budgetPhp:'-1'})).status,400,'invalid budget must be a client validation response');
    assert.equal((await post(staff,{...input,budgetPhp:'1000'})).status,400,'missing budget source must be a client validation response');
    await prisma.staffPermission.deleteMany({where:{userId:staff.user.id,module:'PROJECTS'}});
    assert.equal((await post(staff,input)).status,403,'revocation must apply to existing session');
    await prisma.staffPermission.create({data:{userId:staff.user.id,module:'PROJECTS'}});
  } finally { await prisma.$disconnect(); hook.deregister(); }
});
