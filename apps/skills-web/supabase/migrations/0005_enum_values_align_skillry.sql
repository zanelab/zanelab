-- 0005: 枚举值域对齐 skillry.dev(任务 11-26-skills-filter-enum-fix)
--
-- ① 场景(scenes)4 旧值 → 8 新值(参考站「By use case」实测对齐):
--    品牌建立与视觉规范 → 品牌识别
--    社交内容与营销活动 → 社交媒体
--    内容与编辑发布     → 内容发布
--    知识解释与教学     → 教学讲解
-- ② agents 扩到 10(参考站 agent 目录页前 10):旧数据只有 CC/CX/AG/CU 四码,
--    AG(= Antigravity)/CU(= Cursor)在新值域中语义不变,无需折算;仅幂等
--    守卫(无旧→新码变化,本迁移无 agent 数据改写)。
--
-- 幂等:text[] 数组元素替换——用 unnest/rebuild;where 守卫只折未折过的行
-- (数组中仍含旧值才命中)。重复执行无副作用。

-- ---------- ① 场景旧值折新值(逐旧值一条 update,array_replace 语义) ----------

update public.skills
set scenes = array_replace(scenes, '品牌建立与视觉规范', '品牌识别')
where '品牌建立与视觉规范' = any(scenes);

update public.skills
set scenes = array_replace(scenes, '社交内容与营销活动', '社交媒体')
where '社交内容与营销活动' = any(scenes);

update public.skills
set scenes = array_replace(scenes, '内容与编辑发布', '内容发布')
where '内容与编辑发布' = any(scenes);

update public.skills
set scenes = array_replace(scenes, '知识解释与教学', '教学讲解')
where '知识解释与教学' = any(scenes);
