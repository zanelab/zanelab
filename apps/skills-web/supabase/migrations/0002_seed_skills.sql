-- 0002: 种子技能数据（原 skills-web data.ts 的静态演示数据迁库）
--
-- 任务 11-23-skills-crud-mock：页面数据源切接口前，先把演示数据落库，
-- 保证切数据源后展示一致（title/数值/分组值逐条对齐 data.ts）。
-- 原 data.ts 的 string id（slug）不入库——id 由 identity 生成，前端按返回行
-- 渲染（不再依赖前端 slug）。
-- 幂等：表非空即跳过（iam 项目 0004 同款——admin 已建数据则不覆盖）。

do $$
begin
  if exists (select 1 from public.skills limit 1) then
    return;
  end if;

  insert into public.skills
    (title, free, featured, output_types, roles, scenes, downloads, bookmarks, rating, tone, agents, updated_at)
  values
    ('薄荷暗夜软件产品官网', true, false, ARRAY['网页']::text[], ARRAY['创始人','设计师']::text[], ARRAY['品牌建立与视觉规范']::text[], 340, 6, 5, 'primary', ARRAY['CC','CX','AG','CU']::text[], '2026-11-10'::date),
    ('橙焙电单车商店', true, false, ARRAY['网页','图像']::text[], ARRAY['电商卖家']::text[], ARRAY['社交内容与营销活动','内容与编辑发布']::text[], 241, 8, 5, 'warning', ARRAY['CC','CX','AG','CU']::text[], '2026-11-08'::date),
    ('清新绿药房商店', true, false, ARRAY['网页']::text[], ARRAY['电商卖家']::text[], ARRAY['社交内容与营销活动']::text[], 209, 7, 4, 'success', ARRAY['CC','CX','AG','CU']::text[], '2026-11-05'::date),
    ('贴纸闪赠礼应用网站', true, false, ARRAY['网页','图像']::text[], ARRAY['设计师','内容创作者']::text[], ARRAY['品牌建立与视觉规范','社交内容与营销活动']::text[], 207, 5, 5, 'secondary', ARRAY['CC','CX','AG','CU']::text[], '2026-11-01'::date),
    ('马克笔涂鸦品牌工作室', true, false, ARRAY['网页','图像']::text[], ARRAY['设计师','创始人']::text[], ARRAY['品牌建立与视觉规范']::text[], 186, 7, 4, 'accent', ARRAY['CC','CX','AG','CU']::text[], '2026-10-28'::date),
    ('轨道协作落地站', true, false, ARRAY['网页']::text[], ARRAY['创始人','营销人员']::text[], ARRAY['内容与编辑发布']::text[], 203, 2, 4, 'info', ARRAY['CC','CX','AG','CU']::text[], '2026-10-25'::date),
    ('黑白设计师作品集', true, false, ARRAY['网页']::text[], ARRAY['设计师']::text[], ARRAY['品牌建立与视觉规范']::text[], 184, 4, 5, 'primary', ARRAY['CC','CX','AG','CU']::text[], '2026-10-21'::date),
    ('青柠边框设计师作品集', true, false, ARRAY['网页']::text[], ARRAY['设计师','研究人员']::text[], ARRAY['品牌建立与视觉规范']::text[], 178, 6, 4, 'secondary', ARRAY['CC','CX','AG','CU']::text[], '2026-10-18'::date),
    ('方格纸饮品品牌网站', true, false, ARRAY['网页']::text[], ARRAY['创始人','营销人员']::text[], ARRAY['社交内容与营销活动']::text[], 177, 4, 4, 'warning', ARRAY['CC','CX','AG','CU']::text[], '2026-10-15'::date),
    ('宝蓝宠物用品商店', true, false, ARRAY['网页','图像']::text[], ARRAY['电商卖家']::text[], ARRAY['社交内容与营销活动','内容与编辑发布']::text[], 176, 4, 5, 'primary', ARRAY['CC','CX','AG','CU']::text[], '2026-10-12'::date),
    ('融资路演幻灯片生成', false, true, ARRAY['幻灯片']::text[], ARRAY['创始人','顾问']::text[], ARRAY['知识解释与教学','内容与编辑发布']::text[], 452, 31, 5, 'info', ARRAY['CC','CX']::text[], '2026-11-11'::date),
    ('短视频产品口播脚本', false, true, ARRAY['视频']::text[], ARRAY['营销人员','内容创作者']::text[], ARRAY['社交内容与营销活动','内容与编辑发布']::text[], 388, 22, 4, 'secondary', ARRAY['CC','AG']::text[], '2026-11-09'::date),
    ('品牌插画批量生成', true, false, ARRAY['图像']::text[], ARRAY['设计师','内容创作者']::text[], ARRAY['品牌建立与视觉规范']::text[], 301, 15, 4, 'accent', ARRAY['CC','CX','CU']::text[], '2026-11-03'::date),
    ('课堂教学课件助手', true, false, ARRAY['幻灯片']::text[], ARRAY['教师','研究人员']::text[], ARRAY['知识解释与教学']::text[], 156, 9, 5, 'success', ARRAY['CC']::text[], '2026-10-30'::date);
end $$;
