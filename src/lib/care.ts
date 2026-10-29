// Copy shared by the assessment result pages, betterYou corner and diagnostics page (unchanged from the old site).
const u = (p: string) => `/wp-content/uploads/${p}`;

export const riskFactors = [
  { t: "Incorrect Posture", d: "Repetitive strain and overuse injuries due to poor body mechanics, form, and posture", img: u("2024/09/sit-1.webp"), icon: u("2024/10/posture-12.svg") },
  { t: "Insufficient Recovery", d: "Poor recovery due to sleep deficiency, physical stress, or emotional stress", img: u("2024/09/sit-6.webp"), icon: u("2024/10/Insufficient-h.svg") },
  { t: "Inadequate Nutrition", d: "Nutrition deficiencies from a poor diet or compromised gut microbiome", img: u("2024/09/sit-5.webp"), icon: u("2024/10/Inadequate-h.svg") },
  { t: "Bone Loss", d: "Degeneration of bones and soft tissues in the spine or joints due to gradual wear and tear", img: u("2024/09/sit-2.webp"), icon: u("2024/10/Bone-h.svg") },
  { t: "Muscle Loss", d: "Loss of muscle mass and strength due to inactivity, muscular imbalance, or aging", img: u("2024/09/sit-3.webp"), icon: u("2024/10/muscle-loss-purple.webp") },
  { t: "Chronic Stress", d: "Repeat clenching and muscle tightness due to persistent mental stress", img: u("2024/09/sit-4.webp"), icon: u("2024/10/Chronic-h.svg") },
];

export const outcomes = [
  { t: "Ligament and Tendon Tears", d: "Imbalanced loading damages the tissues connecting muscles and bones, limiting mobility", img: u("2024/09/tendon-tear.webp") },
  { t: "Nerve Damage and Loss of Senses", d: "Prolonged compression damages nerves, causing loss of sensation and muscle weakness", img: u("2024/09/nerve-damage.webp") },
  { t: "Fractures and Skeletal Instability", d: "If not properly cared for, bones become prone to fractures, compromising balance and posture", img: u("2024/09/Fracture.webp") },
  { t: "Degeneration and Inflammation of Joints", d: "The gradual wear of cartilage increases friction and inflammation in joints, leading to chronic pain.", img: u("2024/09/joint-inflamation.webp") },
];

export const toolkit = [
  { t: "Diagnostics Assessments", icon: u("2024/08/assessment_icon_svg.svg") },
  { t: "Recovery Protocols", icon: u("2024/10/Recovery-Protocols.svg") },
  { t: "Nutrition Protocols", icon: u("2024/08/Nutrition-protocols_icon.svg") },
  { t: "Posture Protocols", icon: u("2024/10/Posture-protocols.svg") },
  { t: "Fitness Protocols", icon: u("2024/08/Fitness-protocols_icon.svg") },
  { t: "Health Goals Monitoring", icon: u("2024/10/Health-Score-Monitoring.svg") },
];

export const extraRisks = [
  { t: "Ageing", d: "As age progresses, the natural degeneration of cartilage and bones can weaken joints and muscles, leading to conditions like osteoarthritis. This deterioration often results in chronic pain, reduced mobility, and increased vulnerability to injuries.", icon: u("2024/10/Aging-n.svg") },
  { t: "Sedentary or Straining Occupation", d: "Occupational factors like repetitive motions, heavy lifting, and prolonged sitting can strain muscles and joints, leading to wear and tear over time. This strain often results in chronic pain and increases the risk of developing musculoskeletal disorders.", icon: u("2024/10/Sedentar-n.svg") },
  { t: "Smoking", d: "Smoking impairs blood flow and reduces the delivery of essential nutrients to muscles, bones, and joints, accelerating degeneration and increasing the risk of chronic pain. It also weakens the immune system, making it harder for the body to repair damaged tissues and exacerbating joint inflammation.", icon: u("2024/10/Smoking-n.svg") },
  { t: "Genetics", d: "Genetic factors, including predispositions to cancer, certain neurological and autoimmune conditions, skeletal deformities, and gastrointestinal disorders, can negatively impact muscle, bone, and joint health. These conditions can lead to chronic pain by causing inflammation, nerve damage, or altering the body's ability to repair tissues effectively.", icon: u("2024/10/Genetics-n.svg") },
  { t: "Obesity", d: "Obesity places excessive stress on muscles, bones, and joints, particularly in weight-bearing areas like the knees and hips, leading to accelerated wear and tear. This added strain contributes to joint pain and increases the risk of developing chronic conditions like osteoarthritis.", icon: u("2024/10/Obesity-n.svg") },
  { t: "Diabetes", d: "Diabetes disrupts blood circulation and impedes healing, which can weaken muscles and deteriorate joint health. Persistent high blood sugar levels exacerbate inflammation and nerve damage, often resulting in chronic pain and stiffness.", icon: u("2024/10/Diabetese-n.svg") },
];

export const resultFaqs = [
  { q: "How do betterhood™'s diagnostic assessments work?", a: "betterhood™'s diagnostic assessments provide a comprehensive evaluation of back, neck, shoulder, and knee pain through clinically designed questions. These questions help record symptoms for differential diagnosis. While the results are preliminary and may require further evaluation, they are typically sufficient to create personalized care plans and track progress." },
  { q: "Are the recommended protocols safe?", a: "The assessments are designed to capture any red-flag symptoms that may require in-person medical evaluation. Based on your responses, we may advise seeking further medical supervision when applicable. The prescribed protocols are based on generally safe medical practices. However, if any of your symptoms worsen, you are advised to seek medical attention immediately." },
  { q: "How do I know whether betterhood™ recommendations are working?", a: "You can track progress through regular health assessments hosted in the 'betterYou Corner' section on our website. These assessments help you track key musculoskeletal health metrics like posture, strength, mobility, balance, and overall well-being. We provide tools to monitor your health over time." },
  { q: "How do betterhood™ health assessments work?", a: "betterhood™'s health assessments combine physical tests and lifestyle evaluations to analyze your current health status. Physical tests assess range of motion, ease of movement, balance, and strength. Based on the results, we provide tailored recommendations and actionable steps to improve your well-being." },
  { q: "How long does it take to see results?", a: "The time to see results depends on individual factors such as your current health status, commitment to the recommended protocols, and consistency. Some improvements may be noticeable as early as two weeks, while others may take a few months. Regular assessments will help track your progress and adjust plans as needed." },
];
