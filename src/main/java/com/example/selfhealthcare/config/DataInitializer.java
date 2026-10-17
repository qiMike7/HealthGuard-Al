package com.example.selfhealthcare.config;

import com.example.selfhealthcare.domain.Department;
import com.example.selfhealthcare.domain.Doctor;
import com.example.selfhealthcare.domain.DoctorTitle;
import com.example.selfhealthcare.domain.Hospital;
import com.example.selfhealthcare.domain.HospitalLevel;
import com.example.selfhealthcare.domain.RegistrationSlot;
import com.example.selfhealthcare.domain.SlotPeriod;
import com.example.selfhealthcare.repository.DepartmentRepository;
import com.example.selfhealthcare.repository.DoctorRepository;
import com.example.selfhealthcare.repository.HospitalRepository;
import com.example.selfhealthcare.repository.RegistrationSlotRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Random;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

//科室知识库与号源模拟数据初始化（首次启动幂等填充）
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);
    private static final int SLOT_DAYS = 7;

    private final DepartmentRepository departmentRepository;
    private final HospitalRepository hospitalRepository;
    private final DoctorRepository doctorRepository;
    private final RegistrationSlotRepository registrationSlotRepository;
    private final boolean seedEnabled;

    public DataInitializer(
            DepartmentRepository departmentRepository,
            HospitalRepository hospitalRepository,
            DoctorRepository doctorRepository,
            RegistrationSlotRepository registrationSlotRepository,
            @Value("${triage.seed.enabled:true}") boolean seedEnabled) {
        this.departmentRepository = departmentRepository;
        this.hospitalRepository = hospitalRepository;
        this.doctorRepository = doctorRepository;
        this.registrationSlotRepository = registrationSlotRepository;
        this.seedEnabled = seedEnabled;
    }

    //name, keywords, relatedIndicators, indications, visitNotice
    private static final String[][] DEPARTMENTS = {
            {"心血管内科", "胸闷,胸痛,心悸,高血压,心慌,气短", "收缩压,舒张压,心率,总胆固醇",
                    "高血压、冠心病、心律失常、心力衰竭等心血管疾病的诊断与随访。", "就诊当天携带近期血压记录，必要时空腹以便查血脂。"},
            {"内分泌科", "血糖,多饮,多尿,消瘦,甲状腺,肥胖,乏力", "空腹血糖,餐后血糖,BMI,腰围",
                    "糖尿病、甲状腺疾病、血脂异常、肥胖及代谢综合征管理。", "建议空腹抽血，携带既往血糖监测结果。"},
            {"呼吸内科", "咳嗽,气促,咳痰,哮喘,胸闷,血氧低", "血氧,心率,体温",
                    "感冒咳嗽、哮喘、慢阻肺、肺部感染、低氧血症等呼吸系统疾病。", "发热患者请佩戴口罩，如有咳痰可准备痰液样本。"},
            {"消化内科", "胃胀,腹痛,腹泻,便秘,恶心,反酸,食欲差", "",
                    "胃炎、胃溃疡、胃食管反流、肠炎及肝胆胰疾病。", "胃肠镜检查需提前预约并保持空腹。"},
            {"神经内科", "头痛,头晕,失眠,麻木,抽搐,记忆减退", "收缩压,舒张压,睡眠时长",
                    "头痛头晕、失眠、脑血管病、面瘫、肢体麻木等神经系统疾病。", "记录症状发作时间与诱因，便于医生判断。"},
            {"肾内科", "水肿,尿频,泡沫尿,腰痛,乏力", "",
                    "肾炎、肾功能异常、尿路感染、水肿等肾脏疾病。", "建议留取晨起中段尿样本。"},
            {"普外科", "包块,肿物,疝,阑尾,外伤,腹痛", "",
                    "甲状腺包块、胆囊疾病、疝气、阑尾炎、体表肿物等外科问题。", "携带既往影像与超声检查报告。"},
            {"骨科", "关节痛,腰痛,骨折,颈肩痛,腰腿痛,扭伤", "",
                    "骨折、颈肩腰腿痛、关节炎、骨质疏松等骨关节疾病。", "减少患处活动，携带 X 光或 MRI 影像片子。"},
            {"泌尿外科", "排尿困难,血尿,结石,尿频,前列腺", "",
                    "泌尿系结石、前列腺疾病、泌尿系肿瘤及排尿异常。", "检查前可适当憋尿以便完成超声。"},
            {"耳鼻喉科", "耳鸣,鼻塞,咽痛,听力下降,鼻炎,眩晕", "",
                    "鼻炎、咽喉炎、中耳炎、听力下降、眩晕等耳鼻喉疾病。", "避免用力擤鼻，记录症状持续时间。"},
            {"眼科", "视力下降,眼痛,干眼,飞蚊,视物模糊,流泪", "",
                    "视力下降、白内障、青光眼、干眼症、眼底病变等眼部疾病。", "散瞳检查后短时间内视物模糊，请勿自驾前往。"},
            {"皮肤科", "皮疹,瘙痒,脱发,痤疮,湿疹,过敏", "",
                    "湿疹、痤疮、脱发、皮癣、皮肤过敏等常见皮肤病。", "就诊前避免在患处涂抹药膏或化妆品。"},
            {"中医科", "调理,亚健康,慢性疲劳,失眠,脾胃,体质", "睡眠时长,压力等级",
                    "中医体质调理、亚健康、慢性疲劳、失眠及脾胃调养。", "诊前请勿刮舌苔，便于医生辨证。"},
            {"心理医学科", "焦虑,抑郁,压力大,失眠,情绪低落,烦躁", "压力等级,情绪评分,睡眠时长",
                    "焦虑、抑郁、睡眠障碍、压力管理与情绪问题疏导。", "可提前梳理近期情绪与睡眠变化情况。"},
            {"营养科", "肥胖,消瘦,饮食,营养,体重管理,三高", "BMI,腰围,体重",
                    "体重管理、膳食评估、营养风险干预与慢病饮食指导。", "可携带近三日饮食记录以便评估。"},
            {"急诊科", "急救,昏迷,剧烈胸痛,高热,大出血,休克", "血氧,体温,心率",
                    "急性胸痛、高热惊厥、外伤出血、急性中毒等紧急情况处置。", "紧急情况请直接拨打 120 或前往急诊绿色通道。"}
    };

    private static final String[] SURNAMES = {"张", "李", "王", "刘", "陈", "杨", "赵", "黄"};
    private static final String[] GIVEN_NAMES = {
            "建国", "志强", "秀英", "海燕", "明辉", "文雅", "国庆", "丽华", "伟", "敏", "静", "磊"
    };
    private static final DoctorTitle[] TITLE_CYCLE = {
            DoctorTitle.CHIEF, DoctorTitle.DEPUTY_CHIEF, DoctorTitle.ATTENDING
    };

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            log.info("triage.seed.enabled=false，跳过科室知识库与号源初始化");
            return;
        }
        if (departmentRepository.count() > 0) {
            log.info("科室知识库已存在，跳过初始化（幂等）");
            return;
        }

        List<Department> departments = seedDepartments();
        Hospital tier3Hospital = seedHospital("市第一人民医院", HospitalLevel.TIER3_A, "市中心健康路 1 号", "010-88880001");
        Hospital communityHospital = seedHospital("城南社区卫生服务中心", HospitalLevel.COMMUNITY, "城南区平安街 22 号", "010-88880022");
        seedDoctorsAndSlots(departments, List.of(tier3Hospital, communityHospital));

        log.info("初始化完成：科室 {} 个，医院 2 家", departments.size());
    }

    private List<Department> seedDepartments() {
        List<Department> saved = new java.util.ArrayList<>();
        for (String[] row : DEPARTMENTS) {
            Department department = new Department();
            department.setName(row[0]);
            department.setKeywords(row[1]);
            department.setRelatedIndicators(row[2]);
            department.setIndications(row[3]);
            department.setVisitNotice(row[4]);
            saved.add(departmentRepository.save(department));
        }
        return saved;
    }

    private Hospital seedHospital(String name, HospitalLevel level, String address, String phone) {
        Hospital hospital = new Hospital();
        hospital.setName(name);
        hospital.setLevel(level);
        hospital.setAddress(address);
        hospital.setPhone(phone);
        return hospitalRepository.save(hospital);
    }

    private void seedDoctorsAndSlots(List<Department> departments, List<Hospital> hospitals) {
        Random random = new Random(20260101L);
        LocalDate start = LocalDate.now();
        int index = 0;

        for (Department department : departments) {
            for (Hospital hospital : hospitals) {
                int doctorsPerHospital = hospitals.indexOf(hospital) == 0 ? 2 : 1;
                for (int k = 0; k < doctorsPerHospital; k++) {
                    DoctorTitle title = TITLE_CYCLE[(index + k) % TITLE_CYCLE.length];
                    Doctor doctor = new Doctor();
                    doctor.setName(SURNAMES[index % SURNAMES.length] + GIVEN_NAMES[(index * 3 + k) % GIVEN_NAMES.length]);
                    doctor.setTitle(title);
                    doctor.setSpecialty(firstKeyword(department.getKeywords()));
                    doctor.setRegistrationFee(feeFor(title));
                    doctor.setDepartment(department);
                    doctor.setHospital(hospital);
                    Doctor savedDoctor = doctorRepository.save(doctor);

                    seedSlots(savedDoctor, start, random);
                }
                index++;
            }
        }
    }

    private void seedSlots(Doctor doctor, LocalDate start, Random random) {
        List<RegistrationSlot> slots = new java.util.ArrayList<>();
        for (int day = 1; day <= SLOT_DAYS; day++) {
            LocalDate date = start.plusDays(day);
            for (SlotPeriod period : SlotPeriod.values()) {
                int total = 15 + random.nextInt(16); // 15~30
                int remaining = 5 + random.nextInt(Math.max(1, total - 4)); // 5~total
                RegistrationSlot slot = new RegistrationSlot();
                slot.setDoctor(doctor);
                slot.setDate(date);
                slot.setPeriod(period);
                slot.setTotalSlots(total);
                slot.setRemainingSlots(remaining);
                slots.add(slot);
            }
        }
        registrationSlotRepository.saveAll(slots);
    }

    private String firstKeyword(String keywords) {
        if (keywords == null || keywords.isBlank()) {
            return null;
        }
        String[] parts = keywords.split(",");
        return parts[0].trim();
    }

    private BigDecimal feeFor(DoctorTitle title) {
        return switch (title) {
            case CHIEF -> new BigDecimal("50.00");
            case DEPUTY_CHIEF -> new BigDecimal("30.00");
            case ATTENDING -> new BigDecimal("20.00");
            case PHYSICIAN -> new BigDecimal("15.00");
        };
    }
}
