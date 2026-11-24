<?php

declare(strict_types=1);

return [
    'admin' => [
        [
            'id' => 'admin-online-resources',
            'title' => 'Online Resources',
            'link' => '/administrators/online-resources',
            'inertiaPage' => 'OnlineResources/Admin/Index',
            'section' => 'student_services',
            'icon' => 'qrcode',
            'allowedRoles' => [
                'developer',
                'super_admin',
                'admin',
                'president',
                'vice_president',
                'dean',
                'associate_dean',
                'department_head',
                'program_chair',
                'registrar',
                'assistant_registrar',
                'student_affairs_officer',
                'guidance_counselor',
                'librarian',
            ],
        ],
    ],
];
