-- ============================================================
-- 由 FIN.ins_Detail_Tag_With_Rule 預存程序轉出的「自動分類規則」預設資料
-- 路徑：scripts/sql/finance_detail_auto_rule_seed_from_sp_2026-08-17.sql
-- 前置：必須先執行 scripts/sql/finance_detail_auto_rule_2026-08-17.sql 建好資料表
-- 執行方式：於 SQL Server Management Studio 對 JazzerLife 資料庫執行
--
-- 【重要】規則的執行順序（Priority）是刻意排的，不要任意調動：
--   引擎會依 Priority 由小到大依序套用，而且**每條規則看到的是前面規則改過之後的明細**。
--   原本 SP 用「Tag is null」當守門條件來避免後面的 UPDATE 蓋掉前面的結果，
--   這裡直接翻譯成「標籤 為空白」的比對條件，靠同樣的執行順序達到一模一樣的效果。
--   例如 5/6/7 三條台新證券規則：定期定額先跑，跑完該筆已有標籤，
--   後面的圈存／劃撥就不會再命中同一筆。
--
-- 【重要】本腳本可重複執行：已存在同名且未刪除的規則會自動略過，不會重複建立。
--
-- 【建議】首次套用前，先到「設定 › 自動分類規則」逐條按「執行」並看預覽，
--   確認命中的明細符合預期後再按「執行全部規則」。編號 1、2、12 這三條的動作是
--   「停用明細」（等同 SP 的 set Activate=0，軟刪除），影響最大，務必先確認。
-- ============================================================

DECLARE @UserID INT = 1003;   -- 對應原 SP 硬寫的 UserID=1003，換人請改這裡
DECLARE @RuleID INT;

-- ------------------------------------------------------------
-- 1. 重複計算移除 － 中信卡
--    原句：update Detail set Activate=0 where Tag is null and Description = '中信卡 - -'
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM FIN.DetailAutoRule WHERE UserID = @UserID AND RuleName = N'重複扣款－中信卡' AND Activate = 1)
BEGIN
    INSERT INTO FIN.DetailAutoRule (UserID, RuleName, Priority, IsEnabled, ActionActivate)
    VALUES (@UserID, N'重複扣款－中信卡', 0, 1, 0);
    SET @RuleID = SCOPE_IDENTITY();
    INSERT INTO FIN.DetailAutoRuleCondition (RuleID, Field, Operator, Value, SortOrder) VALUES
        (@RuleID, N'description', N'equals',  N'中信卡 - -', 0),
        (@RuleID, N'tag',         N'isEmpty', NULL,          1);
END

-- ------------------------------------------------------------
-- 2. 重複計算移除 － 台新卡費
--    原句：兩條 like（'%台新卡費%'、'%台新銀行帳戶自動轉帳扣繳台新信用卡款%'），
--          動作相同，這裡用「逗號分隔多值＝OR」合併成一條
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM FIN.DetailAutoRule WHERE UserID = @UserID AND RuleName = N'重複扣款－台新卡費' AND Activate = 1)
BEGIN
    INSERT INTO FIN.DetailAutoRule (UserID, RuleName, Priority, IsEnabled, ActionActivate)
    VALUES (@UserID, N'重複扣款－台新卡費', 1, 1, 0);
    SET @RuleID = SCOPE_IDENTITY();
    INSERT INTO FIN.DetailAutoRuleCondition (RuleID, Field, Operator, Value, SortOrder) VALUES
        (@RuleID, N'description', N'contains', N'台新卡費,台新銀行帳戶自動轉帳扣繳台新信用卡款', 0),
        (@RuleID, N'tag',         N'isEmpty',  NULL,                                            1);
END

-- ------------------------------------------------------------
-- 3. 專案：康樂 － 水電費
--    原句：兩條 like（'%省水%'、'%台電%'）→ IsExcluded=1, Tag='康樂'，合併成一條
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM FIN.DetailAutoRule WHERE UserID = @UserID AND RuleName = N'康樂－水電費' AND Activate = 1)
BEGIN
    INSERT INTO FIN.DetailAutoRule (UserID, RuleName, Priority, IsEnabled, ActionTag, ActionTagMode, ActionIsExcluded)
    VALUES (@UserID, N'康樂－水電費', 2, 1, N'康樂', N'overwrite', 1);
    SET @RuleID = SCOPE_IDENTITY();
    INSERT INTO FIN.DetailAutoRuleCondition (RuleID, Field, Operator, Value, SortOrder) VALUES
        (@RuleID, N'description', N'contains', N'省水,台電', 0);
END

-- ------------------------------------------------------------
-- 4. 專案：信貸投資案 － 描述關鍵字
--    原句：where Description like '%信貸投資案%'
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM FIN.DetailAutoRule WHERE UserID = @UserID AND RuleName = N'信貸投資案－描述關鍵字' AND Activate = 1)
BEGIN
    INSERT INTO FIN.DetailAutoRule (UserID, RuleName, Priority, IsEnabled, ActionTag, ActionTagMode, ActionIsExcluded)
    VALUES (@UserID, N'信貸投資案－描述關鍵字', 3, 1, N'信貸投資案', N'overwrite', 1);
    SET @RuleID = SCOPE_IDENTITY();
    INSERT INTO FIN.DetailAutoRuleCondition (RuleID, Field, Operator, Value, SortOrder) VALUES
        (@RuleID, N'description', N'contains', N'信貸投資案', 0);
END

-- ------------------------------------------------------------
-- 5. 專案：信貸投資案 － 投資買賣劃撥
--    原句：where Category = '投資買賣' and Description like '%劃撥%'
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM FIN.DetailAutoRule WHERE UserID = @UserID AND RuleName = N'信貸投資案－投資買賣劃撥' AND Activate = 1)
BEGIN
    INSERT INTO FIN.DetailAutoRule (UserID, RuleName, Priority, IsEnabled, ActionTag, ActionTagMode, ActionIsExcluded)
    VALUES (@UserID, N'信貸投資案－投資買賣劃撥', 4, 1, N'信貸投資案', N'overwrite', 1);
    SET @RuleID = SCOPE_IDENTITY();
    INSERT INTO FIN.DetailAutoRuleCondition (RuleID, Field, Operator, Value, SortOrder) VALUES
        (@RuleID, N'category',    N'equals',   N'投資買賣', 0),
        (@RuleID, N'description', N'contains', N'劃撥',     1);
END

-- ------------------------------------------------------------
-- 6. 專案：信貸投資案 － 台新證券／定期定額
--    原句：AccountName='台新證券' and Tag is null and Description like '%轉帳支取%0020680100278200'
--    註：原本的 LIKE 是「先出現 轉帳支取、且以該帳號結尾」；這裡拆成兩個「包含」條件，
--        不強制先後順序與結尾，實務上帳號就在描述尾端，命中結果相同
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM FIN.DetailAutoRule WHERE UserID = @UserID AND RuleName = N'信貸投資案－台新證券定期定額' AND Activate = 1)
BEGIN
    INSERT INTO FIN.DetailAutoRule (UserID, RuleName, Priority, IsEnabled, ActionTag, ActionTagMode, ActionNotes, ActionNotesMode, ActionIsExcluded)
    VALUES (@UserID, N'信貸投資案－台新證券定期定額', 5, 1, N'信貸投資案', N'overwrite', N'定期定額', N'overwrite', 1);
    SET @RuleID = SCOPE_IDENTITY();
    INSERT INTO FIN.DetailAutoRuleCondition (RuleID, Field, Operator, Value, SortOrder) VALUES
        (@RuleID, N'accountName', N'equals',   N'台新證券',           0),
        (@RuleID, N'tag',         N'isEmpty',  NULL,                  1),
        (@RuleID, N'description', N'contains', N'轉帳支取',           2),
        (@RuleID, N'description', N'contains', N'0020680100278200',   3);
END

-- ------------------------------------------------------------
-- 7. 專案：信貸投資案 － 台新證券／圈存
--    原句：AccountName='台新證券' and Tag is null and Description like '%轉帳支取%0020150100027979'
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM FIN.DetailAutoRule WHERE UserID = @UserID AND RuleName = N'信貸投資案－台新證券圈存' AND Activate = 1)
BEGIN
    INSERT INTO FIN.DetailAutoRule (UserID, RuleName, Priority, IsEnabled, ActionTag, ActionTagMode, ActionNotes, ActionNotesMode, ActionIsExcluded)
    VALUES (@UserID, N'信貸投資案－台新證券圈存', 6, 1, N'信貸投資案', N'overwrite', N'圈存', N'overwrite', 1);
    SET @RuleID = SCOPE_IDENTITY();
    INSERT INTO FIN.DetailAutoRuleCondition (RuleID, Field, Operator, Value, SortOrder) VALUES
        (@RuleID, N'accountName', N'equals',   N'台新證券',           0),
        (@RuleID, N'tag',         N'isEmpty',  NULL,                  1),
        (@RuleID, N'description', N'contains', N'轉帳支取',           2),
        (@RuleID, N'description', N'contains', N'0020150100027979',   3);
END

-- ------------------------------------------------------------
-- 8. 專案：信貸投資案 － 台新證券／劃撥
--    原句：AccountName='台新證券' and Tag is null and Description like '%劃撥%'
--    註：必須排在 6、7 之後——它的條件比較寬，靠「標籤 為空白」讓已被 6/7 標記的明細不再命中
--
--    ⚠ 原 SP 就有的遮蔽效果（本腳本忠實重現，不是轉換錯誤）：
--      編號 5「Category='投資買賣' and 劃撥」排在這條前面，且**沒有** Tag is null 守門，
--      所以只要該筆的分類是「投資買賣」，Tag 會先被編號 5 填上「信貸投資案」，
--      這條的「標籤 為空白」就不成立，備註『劃撥』永遠寫不進去。
--      若你其實希望這些明細帶上『劃撥』備註，把這條的 Priority 改成比編號 5 小即可
--      （在 UI 上就是用「▲」把它移到「信貸投資案－投資買賣劃撥」之前）。
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM FIN.DetailAutoRule WHERE UserID = @UserID AND RuleName = N'信貸投資案－台新證券劃撥' AND Activate = 1)
BEGIN
    INSERT INTO FIN.DetailAutoRule (UserID, RuleName, Priority, IsEnabled, ActionTag, ActionTagMode, ActionNotes, ActionNotesMode, ActionIsExcluded)
    VALUES (@UserID, N'信貸投資案－台新證券劃撥', 7, 1, N'信貸投資案', N'overwrite', N'劃撥', N'overwrite', 1);
    SET @RuleID = SCOPE_IDENTITY();
    INSERT INTO FIN.DetailAutoRuleCondition (RuleID, Field, Operator, Value, SortOrder) VALUES
        (@RuleID, N'accountName', N'equals',   N'台新證券', 0),
        (@RuleID, N'tag',         N'isEmpty',  NULL,        1),
        (@RuleID, N'description', N'contains', N'劃撥',     2);
END

-- ------------------------------------------------------------
-- 9./10. 專案：信貸投資案 － 證券交易（櫃賣／集賣／集買）
--    原句：where Category + Description like '%櫃賣%'（集賣、集買同理）
--    註：原本把兩個欄位「串接後」再比對，本引擎是逐欄位比對，所以拆成兩條規則
--        （分類命中一條、描述命中一條）。差別只在「關鍵字剛好跨越兩欄接縫」的極端情況，
--        實務上不會發生
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM FIN.DetailAutoRule WHERE UserID = @UserID AND RuleName = N'信貸投資案－證券交易（分類）' AND Activate = 1)
BEGIN
    INSERT INTO FIN.DetailAutoRule (UserID, RuleName, Priority, IsEnabled, ActionTag, ActionTagMode, ActionIsExcluded)
    VALUES (@UserID, N'信貸投資案－證券交易（分類）', 8, 1, N'信貸投資案', N'overwrite', 1);
    SET @RuleID = SCOPE_IDENTITY();
    INSERT INTO FIN.DetailAutoRuleCondition (RuleID, Field, Operator, Value, SortOrder) VALUES
        (@RuleID, N'category', N'contains', N'櫃賣,集賣,集買', 0);
END

IF NOT EXISTS (SELECT 1 FROM FIN.DetailAutoRule WHERE UserID = @UserID AND RuleName = N'信貸投資案－證券交易（描述）' AND Activate = 1)
BEGIN
    INSERT INTO FIN.DetailAutoRule (UserID, RuleName, Priority, IsEnabled, ActionTag, ActionTagMode, ActionIsExcluded)
    VALUES (@UserID, N'信貸投資案－證券交易（描述）', 9, 1, N'信貸投資案', N'overwrite', 1);
    SET @RuleID = SCOPE_IDENTITY();
    INSERT INTO FIN.DetailAutoRuleCondition (RuleID, Field, Operator, Value, SortOrder) VALUES
        (@RuleID, N'description', N'contains', N'櫃賣,集賣,集買', 0);
END

-- ------------------------------------------------------------
-- 11. 帳戶互轉 － 嘉澤標記
--     原句：八條 like（21305 / 1305 / 35641 / 59403 / 31428 / 14478 / 45541 / 08467）
--           + Category like '%帳戶互轉%' → Tag='嘉澤'，合併成一條多值 OR
--     註：'%21305%' 是 '%1305%' 的子集，已被涵蓋，故清單中省略以免重複
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM FIN.DetailAutoRule WHERE UserID = @UserID AND RuleName = N'嘉澤－帳戶互轉標記' AND Activate = 1)
BEGIN
    INSERT INTO FIN.DetailAutoRule (UserID, RuleName, Priority, IsEnabled, ActionTag, ActionTagMode)
    VALUES (@UserID, N'嘉澤－帳戶互轉標記', 10, 1, N'嘉澤', N'overwrite');
    SET @RuleID = SCOPE_IDENTITY();
    INSERT INTO FIN.DetailAutoRuleCondition (RuleID, Field, Operator, Value, SortOrder) VALUES
        (@RuleID, N'category',    N'contains', N'帳戶互轉',                                  0),
        (@RuleID, N'description', N'contains', N'1305,35641,59403,31428,14478,45541,08467',  1);
END

-- ------------------------------------------------------------
-- 12. 帳戶互轉 － 嘉澤停用
--     原句：update Detail set Activate=0 where Category like '%帳戶互轉%' and Tag='嘉澤'
--     註：必須排在 11 之後，才看得到 11 剛打上的標籤
-- ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM FIN.DetailAutoRule WHERE UserID = @UserID AND RuleName = N'嘉澤－帳戶互轉停用' AND Activate = 1)
BEGIN
    INSERT INTO FIN.DetailAutoRule (UserID, RuleName, Priority, IsEnabled, ActionActivate)
    VALUES (@UserID, N'嘉澤－帳戶互轉停用', 11, 1, 0);
    SET @RuleID = SCOPE_IDENTITY();
    INSERT INTO FIN.DetailAutoRuleCondition (RuleID, Field, Operator, Value, SortOrder) VALUES
        (@RuleID, N'category', N'contains', N'帳戶互轉', 0),
        (@RuleID, N'tag',      N'equals',   N'嘉澤',     1);
END
GO

-- 建立結果確認
SELECT r.Priority, r.RuleName, r.IsEnabled,
       r.ActionTag, r.ActionNotes, r.ActionIsExcluded, r.ActionActivate,
       (SELECT COUNT(*) FROM FIN.DetailAutoRuleCondition c WHERE c.RuleID = r.RuleID) AS 條件數
FROM FIN.DetailAutoRule r
WHERE r.UserID = 1003 AND r.Activate = 1
ORDER BY r.Priority;
GO
