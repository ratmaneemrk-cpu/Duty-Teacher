import { CHECKLIST, OTHER_DUTY } from '../constants'

/** ช่องติ๊กหน้าที่เวร และข้อ "อื่นๆ ที่ได้รับมอบหมาย" ที่พิมพ์รายละเอียดได้ */
export default function DutyChecklist({ checklist, otherDuty, onToggle, onOtherChange, disabled }) {
  return (
    <div className="checklist">
      {CHECKLIST.map((c, i) => (
        <label key={c.id} className="check">
          <input type="checkbox" checked={Boolean(checklist[c.id])} onChange={() => onToggle(c.id)} disabled={disabled} />
          <span>{i + 1}. {c.label}</span>
        </label>
      ))}
      <div className="check-other">
        <label className="check">
          <input
            type="checkbox"
            checked={Boolean(checklist[OTHER_DUTY.id])}
            onChange={() => onToggle(OTHER_DUTY.id)}
            disabled={disabled}
          />
          <span>{CHECKLIST.length + 1}. {OTHER_DUTY.label}</span>
        </label>
        <input
          type="text"
          value={otherDuty}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="ระบุงานที่ได้รับมอบหมาย"
          maxLength={300}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
